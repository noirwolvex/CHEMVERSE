#include "afm_interaction.h"

namespace {
constexpr double PI=3.14159265358979323846;
constexpr double TWO_PI=6.28318530717958647692;
constexpr int ERR_INVALID=1;
constexpr int ERR_NUMERIC=2;
constexpr int ERR_STEP_LIMIT=3;
constexpr int MAX_DYNAMIC_STEPS=120000000;
double height_input[CV_AFM_MAX_CELLS]{};
double output[CV_AFM_MAX_CELLS*CV_AFM_OUTPUT_FIELDS]{};
double convolved_height[CV_AFM_MAX_CELLS]{};
double summary[CV_AFM_SUMMARY_FIELDS]{};
int last_error=0;

double absd(double value){return value<0.0?-value:value;}
double minv(double a,double b){return a<b?a:b;}
double maxv(double a,double b){return a>b?a:b;}
double clamp(double value,double low,double high){return value<low?low:(value>high?high:value);}
bool finite(double value){return value==value&&value<=1.0e300&&value>=-1.0e300;}
double sqrtFast(double value){
 if(!(value>0.0))return 0.0;
 double estimate=value>1.0?value:1.0;
 for(int i=0;i<28;++i)estimate=.5*(estimate+value/estimate);
 return estimate;
}
double sinApprox(double value){
 while(value>PI)value-=TWO_PI;
 while(value< -PI)value+=TWO_PI;
 const double x2=value*value;
 return value*(1.0-x2/6.0+x2*x2/120.0-x2*x2*x2/5040.0);
}
double pow23(double value){
 if(!(value>0.0))return 0.0;
 double root=value>1.0?value:1.0;
 for(int i=0;i<36;++i)root=(2.0*root+value/(root*root))/3.0;
 return root*root;
}
double pow32(double value){
 if(!(value>0.0))return 0.0;
 return value*sqrtFast(value);
}
double expApprox(double value);
struct State{double displacement_nm;double velocity_nm_s;};
struct ForceState{double force_nn;double indentation_nm;bool contact;};

ForceState tipSampleForce(double gap_nm,double velocity_nm_s,double tip_radius_nm,
 double young_gpa,double poisson,double adhesion_mj_m2,double hamaker_j){
 const double effective_modulus=young_gpa/(1.0-poisson*poisson);
 const double adhesion_nn=TWO_PI*tip_radius_nm*adhesion_mj_m2*0.001;
 if(gap_nm>0.0){
  const double safe_gap=maxv(gap_nm,0.18);
  const double attractive=hamaker_j*tip_radius_nm*1.0e18/
    (6.0*safe_gap*safe_gap);
  const double cutoff=expApprox(-safe_gap/8.0);
  double force=-minv(12.0,attractive*cutoff);
  if(safe_gap<=0.65)force-=adhesion_nn*expApprox(-safe_gap/0.55);
  return {force,0.0,false};
 }
 const double indentation=-gap_nm;
 const double hertz=minv(120.0,(4.0/3.0)*effective_modulus*
   sqrtFast(tip_radius_nm)*pow32(indentation));
 const double damping=clamp(-velocity_nm_s*1.0e-7,-hertz*0.25,hertz*0.25);
 return {maxv(-adhesion_nn,hertz-adhesion_nn+damping),indentation,true};
}
double expApprox(double value){
 if(value<-40.0)return 0.0;
 if(value>40.0)return 2.35e17;
 const double ln2=.6931471805599453;
 const int power=static_cast<int>(value/ln2);
 const double remainder=value-static_cast<double>(power)*ln2;
 double term=1.0,sum=1.0;
 for(int i=1;i<=14;++i){term*=remainder/static_cast<double>(i);sum+=term;}
 double scale=1.0;
 if(power>0)for(int i=0;i<power;++i)scale*=2.0;
 else for(int i=0;i>power;--i)scale*=.5;
 return sum*scale;
}
double acceleration(const State &state,double phase,double stage_z,double sample_z,
 double amplitude,double omega,double q,double spring,double radius,
 double young,double poisson,double adhesion,double hamaker,
 ForceState *force_out){
 const double tip_z=stage_z+state.displacement_nm;
 const ForceState force=tipSampleForce(tip_z-sample_z,state.velocity_nm_s,
   radius,young,poisson,adhesion,hamaker);
 if(force_out)*force_out=force;
 const double drive=(amplitude/q)*omega*omega*sinApprox(phase);
 const double restoring=omega*omega*(force.force_nn/spring-state.displacement_nm);
 const double damping=(omega/q)*state.velocity_nm_s;
 return restoring-damping+drive;
}
double runTapping(double sample_z,double stage_z,double amplitude,double spring,
 double frequency_hz,double q,double radius,double young,double poisson,
 double adhesion,double hamaker,int cycles,int steps,
 double *deflection,double *peak_force,double *indentation,double *phase_out){
 const double omega=TWO_PI*frequency_hz;
 const double dt=1.0/(frequency_hz*static_cast<double>(steps));
 State state{-amplitude,0.0};
 double maximum=-1.0e300,minimum=1.0e300,force_max=-1.0e300;
 double max_indent=0.0,last_phase=0.0;
 const int total=cycles*steps;
 for(int index=0;index<total;++index){
  const double phase=TWO_PI*static_cast<double>(index%steps)/static_cast<double>(steps);
  const double k1x=state.velocity_nm_s;
  const double k1v=acceleration(state,phase,stage_z,sample_z,amplitude,omega,q,
    spring,radius,young,poisson,adhesion,hamaker,0);
  const State s2{state.displacement_nm+.5*dt*k1x,state.velocity_nm_s+.5*dt*k1v};
  const double k2x=s2.velocity_nm_s;
  const double k2v=acceleration(s2,phase+.5*TWO_PI/static_cast<double>(steps),
    stage_z,sample_z,amplitude,omega,q,spring,radius,young,poisson,adhesion,hamaker,0);
  const State s3{state.displacement_nm+.5*dt*k2x,state.velocity_nm_s+.5*dt*k2v};
  const double k3x=s3.velocity_nm_s;
  const double k3v=acceleration(s3,phase+.5*TWO_PI/static_cast<double>(steps),
    stage_z,sample_z,amplitude,omega,q,spring,radius,young,poisson,adhesion,hamaker,0);
  const State s4{state.displacement_nm+dt*k3x,state.velocity_nm_s+dt*k3v};
  const double k4x=s4.velocity_nm_s;
  const double k4v=acceleration(s4,phase+TWO_PI/static_cast<double>(steps),
    stage_z,sample_z,amplitude,omega,q,spring,radius,young,poisson,adhesion,hamaker,0);
  state.displacement_nm+=dt*(k1x+2*k2x+2*k3x+k4x)/6.0;
  state.velocity_nm_s+=dt*(k1v+2*k2v+2*k3v+k4v)/6.0;
  if(!finite(state.displacement_nm)||!finite(state.velocity_nm_s))return -1.0;
  if(index>=(cycles-1)*steps){
   maximum=maxv(maximum,state.displacement_nm);
   minimum=minv(minimum,state.displacement_nm);
   ForceState force{};
   acceleration(state,phase,stage_z,sample_z,amplitude,omega,q,spring,
     radius,young,poisson,adhesion,hamaker,&force);
   force_max=maxv(force_max,force.force_nn);
   max_indent=maxv(max_indent,force.indentation_nm);
   last_phase=phase;
  }
 }
 if(deflection)*deflection=state.displacement_nm;
 if(peak_force)*peak_force=force_max;
 if(indentation)*indentation=max_indent;
 if(phase_out)*phase_out=last_phase;
 return .5*(maximum-minimum);
}
double cosApprox(double value){
 while(value>PI)value-=TWO_PI;
 while(value< -PI)value+=TWO_PI;
 const double x2=value*value;
 return 1.0-x2/2.0+x2*x2/24.0-x2*x2*x2/720.0;
}
void buildTipConvolution(int grid_size,double scan_width_nm,double tip_radius_nm,
 int tip_geometry,double tip_half_angle_degrees){
 const double pixel=scan_width_nm/static_cast<double>(grid_size-1);
 const double support=tip_radius_nm*(tip_geometry==0?1.0:3.0);
 const int reach=static_cast<int>(support/pixel)+1;
 const double angle=tip_half_angle_degrees*PI/180.0;
 const double tangent=maxv(0.01,sinApprox(angle)/cosApprox(angle));
 for(int y=0;y<grid_size;++y)for(int x=0;x<grid_size;++x){
  double maximum=-1.0e300;
  for(int dy=-reach;dy<=reach;++dy)for(int dx=-reach;dx<=reach;++dx){
   const int sx=x+dx,sy=y+dy;
   if(sx<0||sx>=grid_size||sy<0||sy>=grid_size)continue;
   const double offset_x=static_cast<double>(dx)*pixel;
   const double offset_y=static_cast<double>(dy)*pixel;
   const double radial=sqrtFast(offset_x*offset_x+offset_y*offset_y);
   double tip_height=0.0;
   if(tip_geometry==0){
    if(radial>tip_radius_nm)continue;
    tip_height=tip_radius_nm-sqrtFast(maxv(0.0,
      tip_radius_nm*tip_radius_nm-radial*radial));
   }else if(tip_geometry==1){
    if(radial>support)continue;
    tip_height=radial/tangent;
   }else{
    const double square_radius=maxv(absd(offset_x),absd(offset_y));
    if(square_radius>support)continue;
    tip_height=square_radius/tangent;
   }
   const double candidate=height_input[sy*grid_size+sx]+tip_height;
   maximum=maxv(maximum,candidate);
  }
  convolved_height[y*grid_size+x]=maximum>-1.0e299?maximum:height_input[y*grid_size+x];
 }
}


struct ScanParameters{
 int grid_size;
 double scan_width_nm,free_amplitude_nm,amplitude_setpoint_ratio;
 double spring_constant_n_m,resonance_frequency_khz,quality_factor,tip_radius_nm;
 double young_modulus_gpa,poisson_ratio,adhesion_energy_mj_m2,hamaker_constant_j;
 int scan_mode;
 double contact_force_setpoint_nn;
 int cycles_per_pixel,steps_per_cycle,tip_geometry;
 double tip_half_angle_degrees;
};
ScanParameters scan_parameters{};
int scan_progress=0;
bool scan_active=false,scan_complete=false;
double scan_total_force=0.0,scan_max_force=0.0,scan_total_deflection=0.0;
double scan_total_amplitude=0.0,scan_total_topography=0.0,scan_total_error=0.0;
double scan_max_indentation=0.0,scan_previous_stage_z=0.0,scan_previous_surface=0.0;
int scan_feedback_total=0,scan_contact_cells=0;

void updateScanSummary(){
 summary[0]=static_cast<double>(scan_parameters.grid_size);
 if(scan_progress<=0)return;
 const double processed=static_cast<double>(scan_progress);
 summary[1]=scan_total_force/processed;
 summary[2]=scan_max_force;
 summary[3]=scan_total_deflection/processed;
 summary[4]=scan_total_topography/processed;
 summary[5]=scan_total_amplitude/processed;
 summary[6]=scan_parameters.scan_mode==0?
   summary[5]/scan_parameters.free_amplitude_nm:0.0;
 summary[7]=scan_max_indentation;
 summary[8]=static_cast<double>(scan_feedback_total)/processed;
 summary[9]=scan_parameters.scan_mode==0?scan_total_error/processed:0.0;
 summary[10]=static_cast<double>(scan_contact_cells)/processed;
 summary[11]=static_cast<double>(scan_parameters.scan_mode);
}

}

extern "C" double *cv_afm_height_input(void){return height_input;}

extern "C" const double *cv_afm_scan_begin(
 int grid_size,double scan_width_nm,double free_amplitude_nm,
 double amplitude_setpoint_ratio,double spring_constant_n_m,
 double resonance_frequency_khz,double quality_factor,double tip_radius_nm,
 double young_modulus_gpa,double poisson_ratio,double adhesion_energy_mj_m2,
 double hamaker_constant_j,int scan_mode,double contact_force_setpoint_nn,
 int cycles_per_pixel,int steps_per_cycle,int tip_geometry,
 double tip_half_angle_degrees){
 last_error=0;
 scan_active=false;scan_complete=false;scan_progress=0;
 for(int i=0;i<CV_AFM_SUMMARY_FIELDS;++i)summary[i]=0.0;
 for(int i=0;i<CV_AFM_MAX_CELLS*CV_AFM_OUTPUT_FIELDS;++i)output[i]=0.0;
 const bool valid=grid_size>=8&&grid_size<=CV_AFM_MAX_GRID&&
  finite(scan_width_nm)&&scan_width_nm>=10.0&&scan_width_nm<=1.0e7&&
  finite(free_amplitude_nm)&&free_amplitude_nm>=0.2&&free_amplitude_nm<=100.0&&
  finite(amplitude_setpoint_ratio)&&amplitude_setpoint_ratio>=0.1&&amplitude_setpoint_ratio<=0.98&&
  finite(spring_constant_n_m)&&spring_constant_n_m>=0.01&&spring_constant_n_m<=1000.0&&
  finite(resonance_frequency_khz)&&resonance_frequency_khz>=1.0&&resonance_frequency_khz<=2000.0&&
  finite(quality_factor)&&quality_factor>=1.0&&quality_factor<=1000.0&&
  finite(tip_radius_nm)&&tip_radius_nm>=1.0&&tip_radius_nm<=100.0&&
  finite(young_modulus_gpa)&&young_modulus_gpa>=0.001&&young_modulus_gpa<=1000.0&&
  finite(poisson_ratio)&&poisson_ratio>=0.0&&poisson_ratio<=0.49&&
  finite(adhesion_energy_mj_m2)&&adhesion_energy_mj_m2>=0.0&&adhesion_energy_mj_m2<=500.0&&
  finite(hamaker_constant_j)&&hamaker_constant_j>=1.0e-22&&hamaker_constant_j<=1.0e-18&&
  (scan_mode==0||scan_mode==1)&&finite(contact_force_setpoint_nn)&&
  contact_force_setpoint_nn>=0.01&&contact_force_setpoint_nn<=100.0&&
  cycles_per_pixel>=2&&cycles_per_pixel<=40&&steps_per_cycle>=16&&steps_per_cycle<=64&&
  (tip_geometry==0||tip_geometry==1||tip_geometry==2)&&
  finite(tip_half_angle_degrees)&&tip_half_angle_degrees>=10.0&&tip_half_angle_degrees<=80.0;
 if(!valid){last_error=ERR_INVALID;return 0;}
 if(scan_mode==0&&cycles_per_pixel*steps_per_cycle*grid_size*grid_size*9>MAX_DYNAMIC_STEPS){
  last_error=ERR_STEP_LIMIT;return 0;
 }
 scan_parameters={grid_size,scan_width_nm,free_amplitude_nm,
  amplitude_setpoint_ratio,spring_constant_n_m,resonance_frequency_khz,
  quality_factor,tip_radius_nm,young_modulus_gpa,poisson_ratio,
  adhesion_energy_mj_m2,hamaker_constant_j,scan_mode,contact_force_setpoint_nn,
  cycles_per_pixel,steps_per_cycle,tip_geometry,tip_half_angle_degrees};
 scan_total_force=0.0;scan_max_force=0.0;scan_total_deflection=0.0;
 scan_total_amplitude=0.0;scan_total_topography=0.0;scan_total_error=0.0;
 scan_max_indentation=0.0;scan_feedback_total=0;scan_contact_cells=0;
 buildTipConvolution(grid_size,scan_width_nm,tip_radius_nm,tip_geometry,tip_half_angle_degrees);
 scan_previous_stage_z=height_input[0]+free_amplitude_nm*1.05;
 scan_previous_surface=convolved_height[0];
 scan_active=true;
 summary[0]=static_cast<double>(grid_size);
 return output;
}

extern "C" int cv_afm_scan_advance(int max_pixels){
 if(max_pixels<1){last_error=ERR_INVALID;return -1;}
 if(scan_complete)return scan_progress;
 if(!scan_active){last_error=ERR_INVALID;return -1;}
 last_error=0;
 const int total=scan_parameters.grid_size*scan_parameters.grid_size;
 const int remaining=total-scan_progress;
 const int step=max_pixels<remaining?max_pixels:remaining;
 const int stop=scan_progress+step;
 const double frequency_hz=scan_parameters.resonance_frequency_khz*1000.0;
 const double target_amplitude=scan_parameters.free_amplitude_nm*
   scan_parameters.amplitude_setpoint_ratio;
 const double spring=scan_parameters.spring_constant_n_m;
 while(scan_progress<stop){
  const int index=scan_progress;
  const double surface=convolved_height[index];
  double stage_z=scan_previous_stage_z+(surface-scan_previous_surface);
  double deflection=0.0,peak_force=0.0,indentation=0.0,phase=0.0;
  double measured_amplitude=0.0;
  int feedback_iterations=0;
  if(scan_parameters.scan_mode==0){
   stage_z=maxv(surface+0.15,stage_z);
   for(int iteration=0;iteration<8;++iteration){
    measured_amplitude=runTapping(surface,stage_z,scan_parameters.free_amplitude_nm,spring,
     frequency_hz,scan_parameters.quality_factor,scan_parameters.tip_radius_nm,
     scan_parameters.young_modulus_gpa,scan_parameters.poisson_ratio,
     scan_parameters.adhesion_energy_mj_m2,scan_parameters.hamaker_constant_j,
     scan_parameters.cycles_per_pixel,scan_parameters.steps_per_cycle,
     &deflection,&peak_force,&indentation,&phase);
    if(!finite(measured_amplitude)||measured_amplitude<0.0){
     last_error=ERR_NUMERIC;scan_active=false;return -1;
    }
    feedback_iterations=iteration+1;
    const double error=target_amplitude-measured_amplitude;
    stage_z+=clamp(error*0.08,-scan_parameters.free_amplitude_nm*0.025,
      scan_parameters.free_amplitude_nm*0.025);
    if(absd(error)<scan_parameters.free_amplitude_nm*0.008)break;
   }
   measured_amplitude=runTapping(surface,stage_z,scan_parameters.free_amplitude_nm,spring,
    frequency_hz,scan_parameters.quality_factor,scan_parameters.tip_radius_nm,
    scan_parameters.young_modulus_gpa,scan_parameters.poisson_ratio,
    scan_parameters.adhesion_energy_mj_m2,scan_parameters.hamaker_constant_j,
    scan_parameters.cycles_per_pixel,scan_parameters.steps_per_cycle,
    &deflection,&peak_force,&indentation,&phase);
   if(!finite(measured_amplitude)){
    last_error=ERR_NUMERIC;scan_active=false;return -1;
   }
   scan_total_error+=absd(measured_amplitude-target_amplitude);
  }else{
   const double effective_modulus=scan_parameters.young_modulus_gpa/
     (1.0-scan_parameters.poisson_ratio*scan_parameters.poisson_ratio);
   const double adhesive_force=TWO_PI*scan_parameters.tip_radius_nm*
     scan_parameters.adhesion_energy_mj_m2*.001;
   const double required_hertz=maxv(.0,scan_parameters.contact_force_setpoint_nn+adhesive_force);
   const double denominator=(4.0/3.0)*effective_modulus*sqrtFast(scan_parameters.tip_radius_nm);
   indentation=pow23(required_hertz/maxv(1.0e-18,denominator));
   peak_force=scan_parameters.contact_force_setpoint_nn;
   deflection=peak_force/spring;
   stage_z=surface-indentation-deflection;
   measured_amplitude=0.0;phase=0.0;feedback_iterations=1;
   scan_contact_cells++;
  }
  const int offset=index*CV_AFM_OUTPUT_FIELDS;
  const double measured_topography=scan_parameters.scan_mode==1?
    stage_z+indentation+deflection:
    stage_z-scan_parameters.free_amplitude_nm*0.96;
  output[offset]=measured_topography;
  output[offset+1]=deflection;
  output[offset+2]=peak_force;
  output[offset+3]=measured_amplitude;
  output[offset+4]=phase*180.0/PI;
  output[offset+5]=static_cast<double>(feedback_iterations);
  scan_total_force+=peak_force;scan_max_force=maxv(scan_max_force,peak_force);
  scan_total_deflection+=deflection;scan_total_amplitude+=measured_amplitude;
  scan_total_topography+=measured_topography;
  scan_max_indentation=maxv(scan_max_indentation,indentation);
  scan_feedback_total+=feedback_iterations;
  if(scan_parameters.scan_mode==0&&peak_force>0.0)scan_contact_cells++;
  scan_previous_stage_z=stage_z;
  scan_previous_surface=surface;
  scan_progress++;
 }
 updateScanSummary();
 if(scan_progress>=total){scan_active=false;scan_complete=true;}
 return scan_progress;
}

extern "C" int cv_afm_scan_progress(void){return scan_progress;}
extern "C" int cv_afm_scan_complete(void){return scan_complete?1:0;}

extern "C" const double *cv_afm_scan(
 int grid_size,double scan_width_nm,double free_amplitude_nm,
 double amplitude_setpoint_ratio,double spring_constant_n_m,
 double resonance_frequency_khz,double quality_factor,double tip_radius_nm,
 double young_modulus_gpa,double poisson_ratio,double adhesion_energy_mj_m2,
 double hamaker_constant_j,int scan_mode,double contact_force_setpoint_nn,
 int cycles_per_pixel,int steps_per_cycle,int tip_geometry,
 double tip_half_angle_degrees){
 const double *pointer=cv_afm_scan_begin(grid_size,scan_width_nm,free_amplitude_nm,
  amplitude_setpoint_ratio,spring_constant_n_m,resonance_frequency_khz,
  quality_factor,tip_radius_nm,young_modulus_gpa,poisson_ratio,
  adhesion_energy_mj_m2,hamaker_constant_j,scan_mode,contact_force_setpoint_nn,
  cycles_per_pixel,steps_per_cycle,tip_geometry,tip_half_angle_degrees);
 if(!pointer)return 0;
 if(cv_afm_scan_advance(grid_size*grid_size)<0)return 0;
 return output;
}

extern "C" const double *cv_afm_summary(void){return summary;}
extern "C" const double *cv_afm_output(void){return output;}
extern "C" int cv_afm_last_error(void){return last_error;}
extern "C" int cv_afm_engine_version(void){return 120;}
