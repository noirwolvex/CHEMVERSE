#include "../cpp/afm_interaction.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double a,double b,double tolerance=1e-5){
 return std::fabs(a-b)<=tolerance*(1.0+std::fabs(b));
}
const double *scan(int mode,double force=2.0){
 return cv_afm_scan(16,800.0,8.0,0.72,2.0,300.0,80.0,
  10.0,70.0,0.23,25.0,1.0e-19,mode,force,8,32);
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
 assert(summary[0]==16.0);
 assert(summary[1]>=-12.0&&summary[2]>=summary[1]);
 assert(summary[3]>=-20.0);
 assert(summary[5]>=0.0);
 assert(summary[6]>=0.0&&summary[6]<=1.5);
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
  10.0,700.0,0.23,25.0,1.0e-19,1,3.0,8,32);
 assert(stiff);
 const double stiffIndent=cv_afm_summary()[7];
 assert(stiffIndent<softIndent);

 /* Stronger adhesion increases the contact indentation at the same net load. */
 const double *lowAdhesion=cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,5.0,1.0e-19,1,3.0,8,32);
 assert(lowAdhesion);
 const double lowAdhesionIndent=cv_afm_summary()[7];
 const double *highAdhesion=cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,100.0,1.0e-19,1,3.0,8,32);
 assert(highAdhesion);
 assert(cv_afm_summary()[7]>lowAdhesionIndent);

 /* Invalid grid and out-of-range materials are rejected. */
 assert(!cv_afm_scan(4,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.23,25.0,1e-19,0,2.0,8,32));
 assert(cv_afm_last_error()==1);
 assert(!cv_afm_scan(16,800.0,8.0,.72,2.0,300.0,80.0,
  10.0,70.0,.9,25.0,1e-19,0,2.0,8,32));
 std::puts("CHEMVERSE AFM tip-sample interaction solver: all tests passed");
}
