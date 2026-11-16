#include "../cpp/electron_transport.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double a,double b,double tolerance=1e-8){
 return std::fabs(a-b)<=tolerance*(1.0+std::fabs(b));
}
const double *run(int count,double z,double mass,double density,double energy,
 double thickness,unsigned seed=12345){
 return cv_electron_simulate(count,z,mass,density,energy,thickness,0.0,
   seed,CV_ELECTRON_MAX_TRACKS,500);
}
}
int main(){
 const double *result=run(1800,29,63.546,8.96,20.0,500.0,12345);
 assert(result&&cv_electron_last_error()==0);
 const double *summary=cv_electron_summary();
 assert(summary[0]==1800.0);
 assert(summary[1]+summary[2]+summary[3]==summary[0]);
 assert(summary[11]>=0.0&&summary[11]<=1.0);
 assert(summary[12]>=0.0&&summary[12]<=1.0);
 assert(summary[13]>=0.0);
 assert(summary[14]<1e-7);
 assert(summary[7]>=0.0&&summary[5]>=0.0&&summary[6]>=0.0);
 assert(summary[8]>=0.0);
 assert(summary[10]>=0.0);
 const double incident=summary[0]*20.0;
 const double accounted=summary[5]+summary[6]+summary[7]+summary[8];
 assert(near(incident,accounted,1e-8));
 assert(near(summary[21],summary[19]+summary[20],1e-7));

 assert(summary[16]+summary[17]==summary[4]);
 assert(summary[18]<=CV_ELECTRON_MAX_SECONDARY_TRACKS);
 assert(near(summary[19]+summary[20],summary[21],1e-7));
 const double *secondaryTracks=cv_electron_secondary_tracks();
 if(cv_electron_secondary_track_count()>0){
  assert(secondaryTracks[0]>=2.0);
  assert(secondaryTracks[CV_ELECTRON_TRACK_HEADER_FIELDS+4]==6.0);
 }
 const double *track=cv_electron_tracks();
 assert(track[0]>=2.0);
 assert(near(track[2],20.0));
 const int firstPoint=CV_ELECTRON_TRACK_HEADER_FIELDS;
 assert(near(track[firstPoint+2],0.0));
 assert(near(track[firstPoint+3],20.0));
 assert(track[CV_ELECTRON_TRACK_HEADER_FIELDS+4]>=0.0);
 const double *hist=cv_electron_histogram();
 double histogramEnergy=0.0;
 for(int i=0;i<CV_ELECTRON_HISTOGRAM_BINS;++i){
  assert(hist[i]>=0.0);
  histogramEnergy+=hist[i];
 }
 assert(histogramEnergy>0.0);

 /* Same seed and inputs must produce the identical Monte Carlo result. */
 double firstBackscatter=summary[11],firstTransmission=summary[12],firstDeposit=summary[7];
 assert(run(1800,29,63.546,8.96,20.0,500.0,12345));
 summary=cv_electron_summary();
 assert(near(summary[11],firstBackscatter));
 assert(near(summary[12],firstTransmission));
 assert(near(summary[7],firstDeposit));

 /* A thicker target suppresses transmission; high-Z material increases BSE yield. */
 assert(run(1800,6,12.011,2.2,20.0,50.0,5678));
 const double thinCarbonTransmission=cv_electron_summary()[12];
 assert(run(1800,6,12.011,2.2,20.0,5000.0,5678));
 const double thickCarbonTransmission=cv_electron_summary()[12];
 assert(thickCarbonTransmission<=thinCarbonTransmission+1e-12);
 assert(run(3000,79,196.967,19.32,20.0,500.0,4321));
 const double goldBackscatter=cv_electron_summary()[11];
 assert(run(3000,6,12.011,2.2,20.0,500.0,4321));
 const double carbonBackscatter=cv_electron_summary()[11];
 assert(goldBackscatter>carbonBackscatter);

 /* Higher beam energy penetrates further in the same material. */
 assert(run(1200,29,63.546,8.96,10.0,5000.0,9988));
 const double lowEnergyDepth=cv_electron_summary()[9];
 assert(run(1200,29,63.546,8.96,30.0,5000.0,9988));
 const double highEnergyDepth=cv_electron_summary()[9];
 assert(highEnergyDepth>lowEnergyDepth);

 assert(!run(0,29,63.546,8.96,20.0,500.0));
 assert(cv_electron_last_error()==1);
 assert(!run(100,120,250,8.96,20.0,500.0));
 assert(!run(100,29,63.546,8.96,0.1,500.0));
 std::puts("CHEMVERSE electron transport Monte Carlo: all tests passed");
}
