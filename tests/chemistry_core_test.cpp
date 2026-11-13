#include "../cpp/chemistry_core.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <limits>
namespace { bool near(double a,double b){return std::fabs(a-b)<1.0e-9;} }
int main() {
  assert(cv_reaction_is_balanced()==1 && cv_engine_version()==100);
  const CvReactionResult *r=cv_calculate_reaction(10.0,10.0,1.0);
  assert(r->error_code==0 && r->atom_balance_ok==1 && r->limiting_reagent==0);
  assert(near(r->extent_mmol,10.0) && near(r->sodium_acetate_mmol,10.0));
  assert(near(r->water_mmol,10.0) && near(r->carbon_dioxide_mmol,10.0));
  assert(near(r->acetic_acid_remaining_mmol,0.0) && near(r->sodium_bicarbonate_remaining_mmol,0.0));
  r=cv_calculate_reaction(10.0,8.0,0.5);
  assert(r->error_code==0 && r->atom_balance_ok==1 && r->limiting_reagent==2);
  assert(near(r->extent_mmol,4.0) && near(r->acetic_acid_remaining_mmol,6.0));
  assert(near(r->sodium_bicarbonate_remaining_mmol,4.0) && near(r->carbon_dioxide_mmol,4.0));
  r=cv_calculate_reaction(6.0,12.0,1.5);
  assert(r->error_code==0 && r->atom_balance_ok==1 && r->limiting_reagent==1);
  assert(near(r->progress,1.0) && near(r->extent_mmol,6.0));
  assert(near(r->sodium_bicarbonate_remaining_mmol,6.0));
  assert(cv_calculate_reaction(-1.0,2.0,0.5)->error_code==1);
  assert(cv_calculate_reaction(std::numeric_limits<double>::quiet_NaN(),2.0,0.5)->error_code==1);
  assert(near(cv_demo_progress(0.0),0.0));
  assert(cv_demo_progress(6.0)>0.0 && cv_demo_progress(6.0)<1.0);
  assert(near(cv_demo_progress(12.0),1.0) && near(cv_demo_progress(18.0),1.0));
  std::puts("CHEMVERSE chemistry core: all tests passed");
}
