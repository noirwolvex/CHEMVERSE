#include "electron_transport.h"

namespace {
constexpr double PI = 3.14159265358979323846;
constexpr double HALF_PI = 1.57079632679489661923;
constexpr double TWO_PI = 6.28318530717958647692;
constexpr double ELECTRON_REST_KEV = 510.99895;
constexpr int ERR_INVALID = 1;
constexpr int ERR_NUMERIC = 2;
constexpr int ERR_STEP_LIMIT = 3;
constexpr int MAX_PRIMARY_COUNT = 50000;
constexpr int MAX_COLLISIONS = 2000;
constexpr double MIN_ENERGY_KEV = 0.05;
constexpr int TRACK_STRIDE = CV_ELECTRON_TRACK_HEADER_FIELDS +
  CV_ELECTRON_MAX_POINTS * CV_ELECTRON_POINT_FIELDS;

double summary[CV_ELECTRON_SUMMARY_FIELDS]{};
double histogram[CV_ELECTRON_HISTOGRAM_BINS]{};
double tracks[CV_ELECTRON_MAX_TRACKS * TRACK_STRIDE]{};
int last_error = 0;
unsigned int rng_state = 1u;

double absd(double value) { return value < 0.0 ? -value : value; }
double minv(double a, double b) { return a < b ? a : b; }
double maxv(double a, double b) { return a > b ? a : b; }
double clamp(double value, double low, double high) {
  return value < low ? low : (value > high ? high : value);
}
bool finite(double value) {
  return value == value && value <= 1.0e300 && value >= -1.0e300;
}
double sqrtFast(double value) {
  if (!(value > 0.0)) return 0.0;
  double estimate = value > 1.0 ? value : 1.0;
  for (int i = 0; i < 28; ++i) estimate = 0.5 * (estimate + value / estimate);
  return estimate;
}
double logFast(double value) {
  if (!(value > 0.0)) return -1.0e300;
  int exponent = 0;
  while (value >= 1.4142135623730951) { value *= 0.5; ++exponent; }
  while (value < 0.7071067811865476) { value *= 2.0; --exponent; }
  const double y = (value - 1.0) / (value + 1.0);
  const double y2 = y * y;
  double term = y, sum = y;
  for (int divisor = 3; divisor <= 51; divisor += 2) {
    term *= y2;
    sum += term / static_cast<double>(divisor);
  }
  return 2.0 * sum + static_cast<double>(exponent) * 0.6931471805599453;
}
double expFast(double value) {
  if (value > 80.0) return 5.54e34;
  if (value < -80.0) return 0.0;
  const double ln2 = 0.6931471805599453;
  const int power = static_cast<int>(value / ln2);
  const double remainder = value - static_cast<double>(power) * ln2;
  double term = 1.0, sum = 1.0;
  for (int i = 1; i <= 14; ++i) {
    term *= remainder / static_cast<double>(i);
    sum += term;
  }
  double scale = 1.0;
  if (power > 0) for (int i = 0; i < power; ++i) scale *= 2.0;
  else for (int i = 0; i > power; --i) scale *= 0.5;
  return sum * scale;
}
double powFast(double base, double exponent) {
  if (exponent == 0.0) return 1.0;
  if (!(base > 0.0)) return 0.0;
  return expFast(exponent * logFast(base));
}
double sinApprox(double value) {
  while (value > PI) value -= TWO_PI;
  while (value < -PI) value += TWO_PI;
  const double x2 = value * value;
  return value * (1.0 - x2 / 6.0 + x2*x2 / 120.0 - x2*x2*x2 / 5040.0);
}
double cosApprox(double value) {
  while (value > PI) value -= TWO_PI;
  while (value < -PI) value += TWO_PI;
  const double x2 = value * value;
  return 1.0 - x2 / 2.0 + x2*x2 / 24.0 - x2*x2*x2 / 720.0;
}
unsigned int nextUInt() {
  unsigned int x = rng_state;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  rng_state = x ? x : 0x9e3779b9u;
  return rng_state;
}
double random01() {
  return (static_cast<double>(nextUInt() & 0x00ffffffu) + 0.5) / 16777216.0;
}
struct Vec3 { double x, y, z; };
Vec3 add(Vec3 a, Vec3 b) { return {a.x+b.x,a.y+b.y,a.z+b.z}; }
Vec3 scale(Vec3 a, double s) { return {a.x*s,a.y*s,a.z*s}; }
Vec3 cross(Vec3 a, Vec3 b) {
  return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};
}
double norm(Vec3 a) { return sqrtFast(a.x*a.x+a.y*a.y+a.z*a.z); }
Vec3 normalize(Vec3 a) {
  const double length = norm(a);
  return length > 1.0e-24 ? scale(a,1.0/length) : Vec3{0.0,0.0,1.0};
}
Vec3 randomUnit() {
  Vec3 value{2.0*random01()-1.0,2.0*random01()-1.0,2.0*random01()-1.0};
  if (value.x*value.x+value.y*value.y+value.z*value.z < 1.0e-12) value.z=1.0;
  return normalize(value);
}
Vec3 scatterDirection(Vec3 direction, double atomic_number, double energy_kev) {
  const double screening = clamp(
    0.0045 * powFast(atomic_number,0.6666666667) / maxv(energy_kev,0.2),
    0.0005,0.25);
  const double reciprocal = 1.0/screening;
  const double denominator = reciprocal - random01() *
    (reciprocal - 1.0/(2.0+screening));
  const double one_minus_cosine = clamp(1.0/denominator-screening,0.0,2.0);
  const double cosine = clamp(1.0-one_minus_cosine,-1.0,1.0);
  const double sine = sqrtFast(maxv(0.0,1.0-cosine*cosine));
  Vec3 reference = randomUnit();
  Vec3 perpendicular = cross(direction,reference);
  if (norm(perpendicular) < 1.0e-8) {
    reference = absd(direction.z)<0.8 ? Vec3{0.0,0.0,1.0} : Vec3{0.0,1.0,0.0};
    perpendicular = cross(direction,reference);
  }
  perpendicular = normalize(perpendicular);
  Vec3 second = normalize(cross(direction,perpendicular));
  const double azimuth = TWO_PI*random01();
  Vec3 radial = add(scale(perpendicular,cosApprox(azimuth)),
                    scale(second,sinApprox(azimuth)));
  return normalize(add(scale(direction,cosine),scale(radial,sine)));
}
double kanayaOkayamaRangeNm(double energy_kev,double z,double mass,double density) {
  /* Kanaya-Okayama empirical projected range, in micrometres, converted to nm. */
  return 27.6 * mass * powFast(energy_kev,1.67) /
    (density * powFast(z,0.889));
}
double continuousEnergyLoss(double energy_kev,double distance_nm,
                            double z,double mass,double density) {
  const double range = maxv(1.0,kanayaOkayamaRangeNm(energy_kev,z,mass,density));
  const double stopping_kev_nm = energy_kev / (1.67 * range);
  return minv(energy_kev,maxv(0.0,stopping_kev_nm*distance_nm));
}
double meanFreePathNm(double energy_kev,double z,double density) {
  return clamp(20.0*powFast(maxv(energy_kev,0.15),1.35) /
    (density*powFast(z,0.60)),0.08,400.0);
}
void appendPoint(int track,double x,double y,double z,double energy,int event) {
  if (track < 0 || track >= CV_ELECTRON_MAX_TRACKS) return;
  const int base = track * TRACK_STRIDE;
  const int count = static_cast<int>(tracks[base]);
  if (count >= CV_ELECTRON_MAX_POINTS) return;
  const int offset = base + CV_ELECTRON_TRACK_HEADER_FIELDS +
    count * CV_ELECTRON_POINT_FIELDS;
  tracks[offset] = x;
  tracks[offset+1] = y;
  tracks[offset+2] = z;
  tracks[offset+3] = energy;
  tracks[offset+4] = static_cast<double>(event);
  tracks[base] = static_cast<double>(count+1);
}
}

extern "C" const double *cv_electron_simulate(
  int primary_count,double atomic_number,double atomic_mass_g_mol,
  double density_g_cm3,double beam_energy_kev,double thickness_nm,
  double beam_tilt_degrees,unsigned int random_seed,
  int recorded_track_count,int maximum_collisions_per_track) {
  last_error=0;
  for(int i=0;i<CV_ELECTRON_SUMMARY_FIELDS;++i)summary[i]=0.0;
  for(int i=0;i<CV_ELECTRON_HISTOGRAM_BINS;++i)histogram[i]=0.0;
  for(int i=0;i<CV_ELECTRON_MAX_TRACKS*TRACK_STRIDE;++i)tracks[i]=0.0;

  const bool valid=primary_count>=1&&primary_count<=MAX_PRIMARY_COUNT&&
    finite(atomic_number)&&atomic_number>=1.0&&atomic_number<=92.0&&
    finite(atomic_mass_g_mol)&&atomic_mass_g_mol>=1.0&&atomic_mass_g_mol<=250.0&&
    finite(density_g_cm3)&&density_g_cm3>0.0&&density_g_cm3<=25.0&&
    finite(beam_energy_kev)&&beam_energy_kev>=0.5&&beam_energy_kev<=300.0&&
    finite(thickness_nm)&&thickness_nm>=1.0&&thickness_nm<=1.0e7&&
    finite(beam_tilt_degrees)&&absd(beam_tilt_degrees)<=75.0&&
    recorded_track_count>=0&&recorded_track_count<=CV_ELECTRON_MAX_TRACKS&&
    maximum_collisions_per_track>=1&&maximum_collisions_per_track<=MAX_COLLISIONS;
  if(!valid){last_error=ERR_INVALID;return 0;}

  rng_state=random_seed?random_seed:0x6d2b79f5u;
  const double tilt=beam_tilt_degrees*PI/180.0;
  const Vec3 initial_direction=normalize({sinApprox(tilt),0.0,cosApprox(tilt)});
  double deposited_total=0.0,backscatter_energy=0.0,transmitted_energy=0.0;
  double secondary_energy_total=0.0,penetration_sum=0.0,event_sum=0.0;
  int backscattered=0,transmitted=0,absorbed=0,secondary_count=0;
  int global_events=0;
  const int tracks_to_record=recorded_track_count<primary_count?
    recorded_track_count:primary_count;

  for(int primary=0;primary<primary_count;++primary){
    Vec3 position{(random01()-0.5)*3.0,(random01()-0.5)*3.0,0.0};
    Vec3 direction=initial_direction;
    double energy=beam_energy_kev;
    double primary_deposited=0.0;
    int collisions=0;
    int outcome=0;
    const int track=primary<tracks_to_record?primary:-1;
    if(track>=0){
      const int base=track*TRACK_STRIDE;
      tracks[base+1]=0.0;
      tracks[base+2]=beam_energy_kev;
      appendPoint(track,position.x,position.y,position.z,energy,0);
    }

    while(energy>MIN_ENERGY_KEV&&collisions<maximum_collisions_per_track){
      if(global_events>=primary_count*MAX_COLLISIONS){
        last_error=ERR_STEP_LIMIT;
        return 0;
      }
      const double lambda=meanFreePathNm(energy,atomic_number,density_g_cm3);
      const double free_path=-lambda*logFast(maxv(1.0e-12,random01()));
      double travel=clamp(free_path,0.05,2000.0);
      bool exiting=false;
      int boundary=0;
      if(direction.z< -1.0e-12){
        const double to_top=-position.z/direction.z;
        if(to_top>=0.0&&to_top<travel){travel=to_top;exiting=true;boundary=-1;}
      }else if(direction.z>1.0e-12){
        const double to_bottom=(thickness_nm-position.z)/direction.z;
        if(to_bottom>=0.0&&to_bottom<travel){travel=to_bottom;exiting=true;boundary=1;}
      }
      const double loss=continuousEnergyLoss(energy,travel,atomic_number,
        atomic_mass_g_mol,density_g_cm3);
      energy=maxv(0.0,energy-loss);
      primary_deposited+=loss;
      deposited_total+=loss;
      position=add(position,scale(direction,travel));

      int event=1;
      if(exiting){
        event=boundary<0?2:3;
        if(track>=0)appendPoint(track,position.x,position.y,position.z,energy,event);
        if(boundary<0){backscattered++;backscatter_energy+=energy;outcome=1;}
        else{transmitted++;transmitted_energy+=energy;outcome=2;}
        break;
      }

      /* A near-surface inelastic event can liberate a low-energy secondary. */
      const double escape_depth=expFast(-maxv(0.0,position.z)/2.5);
      const double expected_secondaries=(loss*1000.0/35.0)*0.018*escape_depth;
      if(random01()<clamp(expected_secondaries,0.0,0.92)&&loss>0.005){
        const double secondary_energy=minv(loss,0.005+0.025*random01());
        deposited_total=maxv(0.0,deposited_total-secondary_energy);
        primary_deposited=maxv(0.0,primary_deposited-secondary_energy);
        secondary_energy_total+=secondary_energy;
        secondary_count++;
        event=4;
      }

      const int bin=static_cast<int>(clamp(
        position.z/thickness_nm*CV_ELECTRON_HISTOGRAM_BINS,
        0.0,static_cast<double>(CV_ELECTRON_HISTOGRAM_BINS-1)));
      histogram[bin]+=loss;
      direction=scatterDirection(direction,atomic_number,energy);
      collisions++;
      global_events++;
      if(track>=0)appendPoint(track,position.x,position.y,position.z,energy,event);
      if(energy<=MIN_ENERGY_KEV){
        deposited_total+=energy;
        primary_deposited+=energy;
        energy=0.0;
        absorbed++;
        outcome=3;
        if(track>=0)appendPoint(track,position.x,position.y,position.z,energy,5);
        break;
      }
    }
    if(outcome==0){
      /* Stopped or collision-limited primaries deposit their remaining energy. */
      deposited_total+=energy;
      primary_deposited+=energy;
      energy=0.0;
      absorbed++;
      if(track>=0)appendPoint(track,position.x,position.y,position.z,energy,5);
      outcome=3;
    }
    if(track>=0)tracks[track*TRACK_STRIDE+1]=static_cast<double>(outcome);
    penetration_sum+=maxv(0.0,position.z);
    event_sum+=static_cast<double>(collisions);
  }

  const double incident=static_cast<double>(primary_count)*beam_energy_kev;
  const double accounted=deposited_total+backscatter_energy+
    transmitted_energy+secondary_energy_total;
  const double closure=absd(incident-accounted);
  const double tolerance=maxv(1.0e-7,incident*1.0e-8);
  if(closure>tolerance){last_error=ERR_NUMERIC;return 0;}

  summary[0]=static_cast<double>(primary_count);
  summary[1]=static_cast<double>(backscattered);
  summary[2]=static_cast<double>(transmitted);
  summary[3]=static_cast<double>(absorbed);
  summary[4]=static_cast<double>(secondary_count);
  summary[5]=backscatter_energy;
  summary[6]=transmitted_energy;
  summary[7]=deposited_total;
  summary[8]=secondary_energy_total;
  summary[9]=penetration_sum/static_cast<double>(primary_count);
  summary[10]=event_sum/static_cast<double>(primary_count);
  summary[11]=static_cast<double>(backscattered)/static_cast<double>(primary_count);
  summary[12]=static_cast<double>(transmitted)/static_cast<double>(primary_count);
  summary[13]=static_cast<double>(secondary_count)/static_cast<double>(primary_count);
  summary[14]=closure;
  summary[15]=static_cast<double>(global_events);
  return summary;
}

extern "C" const double *cv_electron_summary(void){return summary;}
extern "C" const double *cv_electron_histogram(void){return histogram;}
extern "C" const double *cv_electron_tracks(void){return tracks;}
extern "C" int cv_electron_last_error(void){return last_error;}
extern "C" int cv_electron_engine_version(void){return 100;}
