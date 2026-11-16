#include "../cpp/afm_interaction.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <limits>

namespace {
bool near(double a,double b,double tolerance=1e-5){
 return std::fabs(a-b)<=tolerance*(1.0+std::fabs(b));
}
const double *scan(int mode,double force=2.0,int tip_geometry=0,double tip_angle=30.0){
 return cv_afm_scan(16,800.0,8.0,0.72,2.0,300.0,80.0,
  10.0,70.0,0.23,25.0,1.0e-19,mode,force,8,32,tip_geometry,tip_angle);
}
}
int main(){
 double *input=cv_afm_height_input();
 assert(input);
 for(int i=0;i<16*16;++i)input[i]=0.0;
 const double *tap=scan(0);
 if(!tap)std::fprintf(stderr,"AFM tap engine error %d\\n",cv_afm_last_error());
 assert(tap&&cv_afm_last_error()==0);
 const double *summary=cv_afm_summary();
 std::fprintf(stderr,"AFM tapping diagnostics: amplitude=%.6f nm ratio=%.6f force=%.6f nN indentation=%.6f nm feedback=%.3f\\n",summary[5],summary[6],summary[1],summary[7],summary[8]);
 assert(summary[0]==16.0);
 assert(summary[1]>=-12.0&&summary[2]>=summary[1]);
 assert(summary[3]>=-20.0);
 assert(summary[5]>=0.0);
 assert(summary[6]>=0.60&&summary[6]<=0.84);
 assert(summary[7]<0.2);
 assert(summary[8]>=1.0&&summary[8]<=8.0);
 assert(summary[9]>=0.0);
 const double *output=cv_afm_output();
 for(int i=0;i<16*16;++i){
  assert(std::isfinite(output[i*CV_AFM_OUTPUT_FIELDS]));
  assert(std::isfinite(output[i*CV_AFM_OUTPUT_FIELDS+1]));
  assert(std::isfinite(output[i*CV_AFM_OUTPUT_FIELDS+2]));
  assert(std::isfinite(output[i*CV_AFM_OUTPUT_FIELDS+3]));
  assert(output[i*CV_AFM_OUTPUT_FIELDS+5]>=1.0);
 }

 /* A 20 nm step in the upper half must appear in recovered topography. */
 for(int y=0;y<16;++y)for(int x=0;x<16;++x)input[y*16+x]=x>=8?20.0:0.0;
 assert(scan(0));
 output=cv_afm_output();
 double left=0.0,right=0.0;
 for(int y=2;y<14;++y)for(int x=2;x<7;++x)left+=output[(y*16+x)*CV_AFM_OUTPUT_FIELDS];
 for(int y=2;y<14;++y)for(int x=9;x<14;++x)right+=output[(y*16+x)*CV_AFM_OUTPUT_FIELDS];
 left/=60.0;right/=60.0;
 std::printf("AFM step recovery left=%.6f right=%.6f delta=%.6f\\n",left,right,right-left);
 assert(right-left>12.0&&right-left<28.0);

 /* Contact mode solves the Hertz/DMT force setpoint and returns surface height. */
 const double *contact=scan(1,3.0);
 assert(contact&&cv_afm_last_error()==0);
 summary=cv_afm_summary();output=cv_afm_output();
 assert(near(summary[1],3.0,1e-8));
 assert(near(summary[2],3.0,1e-8));
 for(int y=2;y<14;++y)for(int x=2;x<14;++x){
  const int i=y*16+x;
  assert(near(output[i*CV_AFM_OUTPUT_FIELDS],input[i],1e-7));
  assert(near(output[i*CV_AFM_OUTPUT_FIELDS+2],3.0,1e-8));
 }
 assert(summary[10]==1.0);

 /* Stiffer samples need less Hertz indentation at the same contact force. */
 assert(scan(1,3.0));
 const double softIndent=cv_afm_summary()[7];
 const int n=16*16;
 for(int i=0;i<n;++i)input[i]=0.0;
 const double *stiff=cv_afm_scan(16,800.0,8.0,0.72,2.0,300.0,80.0,
  10.0,700.0,0.23,25.0,1.0e-19,1,3.0,8,32,0,30.0);
 assert(stiff);
 const double stiffIndent=cv_afm_summary()[7];
 assert(stiffIndent<softIndent);

 /* Stronger adhesion increases the contact indentation at the same net load. */
 const double *lowAdhesion=cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,5.0,1.0e-19,1,3.0,8,32,0,30.0);
 assert(lowAdhesion);
 const double lowAdhesionIndent=cv_afm_summary()[7];
 const double *highAdhesion=cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,100.0,1.0e-19,1,3.0,8,32,0,30.0);
 assert(highAdhesion);
 assert(cv_afm_summary()[7]>lowAdhesionIndent);


 /* Finite-radius spherical, conical and pyramidal tips broaden a narrow pillar. */
 for(int i=0;i<16*16;++i)input[i]=0.0;
 input[8*16+8]=20.0;
 const double *sphereScan=cv_afm_scan(16,64.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1.0e-19,1,3.0,8,32,0,30.0);
 assert(sphereScan);
 const double sphereNeighbour=cv_afm_output()[(8*16+9)*CV_AFM_OUTPUT_FIELDS];
 assert(sphereNeighbour>20.0&&sphereNeighbour<24.0);
 const double *coneScan=cv_afm_scan(16,64.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1.0e-19,1,3.0,8,32,1,30.0);
 assert(coneScan);
 const double coneNeighbour=cv_afm_output()[(8*16+9)*CV_AFM_OUTPUT_FIELDS];
 assert(coneNeighbour>sphereNeighbour);
 const double *pyramidScan=cv_afm_scan(16,64.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1.0e-19,1,3.0,8,32,2,30.0);
 assert(pyramidScan);
 const double pyramidDiagonal=cv_afm_output()[(9*16+9)*CV_AFM_OUTPUT_FIELDS];
 assert(pyramidDiagonal>20.0);

 /* Incremental raster batches expose solved pixels before the scan is complete.
  * Finishing in batches must be numerically identical to the compatibility API. */
 const double *session=cv_afm_scan_begin(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1.0e-19,1,3.0,8,32,0,30.0);
 assert(session&&cv_afm_last_error()==0);
 assert(cv_afm_scan_progress()==0&&cv_afm_scan_complete()==0);
 int progress=cv_afm_scan_advance(13);
 assert(progress==13&&cv_afm_scan_progress()==13&&cv_afm_scan_complete()==0);
 output=cv_afm_output();
 assert(output[5]>=1.0);
 assert(output[13*CV_AFM_OUTPUT_FIELDS+5]==0.0);
 assert(near(cv_afm_summary()[1],3.0,1e-8));
 progress=cv_afm_scan_advance(17);
 assert(progress==30&&cv_afm_scan_complete()==0);
 while(progress<16*16){
  const int next=cv_afm_scan_advance(23);
  assert(next>progress);
  progress=next;
 }
 assert(progress==16*16&&cv_afm_scan_complete()==1);
 double staged[16*16*CV_AFM_OUTPUT_FIELDS]{};
 output=cv_afm_output();
 for(int i=0;i<16*16*CV_AFM_OUTPUT_FIELDS;++i)staged[i]=output[i];
 assert(scan(1,3.0));
 output=cv_afm_output();
 for(int i=0;i<16*16*CV_AFM_OUTPUT_FIELDS;++i)assert(near(staged[i],output[i],1e-12));
 assert(cv_afm_scan_progress()==16*16&&cv_afm_scan_complete()==1);


 /* Even an oversized positive batch is capped without integer overflow. */
 assert(cv_afm_scan_begin(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1.0e-19,1,3.0,8,32,0,30.0));
 assert(cv_afm_scan_advance(std::numeric_limits<int>::max())==16*16);
 assert(cv_afm_scan_complete()==1);

 /* Invalid grid and out-of-range materials are rejected. */
 assert(!cv_afm_scan(4,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1e-19,0,2.0,8,32,0,30.0));
 assert(cv_afm_last_error()==1);
 assert(!cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.9,25.0,1e-19,0,2.0,8,32,0,30.0));
 std::puts("CHEMVERSE AFM tip-sample interaction solver: all tests passed");
}
