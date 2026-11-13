#include "../cpp/kinetics_engine.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double a, double b, double tol = 1.0e-7) {
  return std::fabs(a-b) <= tol * (1.0 + std::fabs(b));
}
const double *run(double a, double b, double volume, double k, double m, double n,
                  double temp, double tref, double ea, int arrhenius, double duration) {
  return cv_kinetics_simulate(a,b,volume,k,m,n,temp,tref,ea,arrhenius,duration,0.05,101);
}
}
int main() {
  const int last = 100 * CV_KINETICS_FIELDS_PER_SAMPLE;
  /* First order: [A](t) = [A]0 exp(-kt). */
  const double *first = run(8,16,100,0.2,1,0,25,25,0,0,5);
  assert(first && cv_kinetics_last_error()==0 && cv_kinetics_atom_balance_ok()==1);
  const double expected = 8.0 * std::exp(-1.0);
  assert(near(first[last+3],expected,2e-6));
  assert(near(first[last+2]+first[last+3],8.0));
  const double first_final = first[last+3];

  /* Volume changes initial concentrations and therefore rate. */
  const double *large = run(10,10,200,2,1,1,25,25,0,0,10);
  assert(large);
  const double large_final = large[last+3];
  const double *small = run(10,10,100,2,1,1,25,25,0,0,10);
  assert(small && small[last+3] < large_final);

  /* Arrhenius correction: a higher temperature increases k for positive Ea. */
  const double *hot = run(8,16,100,0.2,1,0,45,25,50,1,5);
  assert(hot && cv_kinetics_effective_k() > 0.2 && hot[last+3] < first_final);
  /* Without Ea, temperature does not magically modify k. */
  const double *visual_only_temp = run(8,16,100,0.2,1,0,60,25,0,0,5);
  assert(visual_only_temp && near(cv_kinetics_effective_k(),0.2));
  assert(near(visual_only_temp[last+3],first_final,2e-6));

  /* Equal second-order reaction: C = C0 / (1 + k*C0*t). */
  const double *second = run(10,10,100,2,1,1,25,25,0,0,10);
  assert(second);
  assert(near(second[last+3]/100.0,0.1/(1.0+2.0*0.1*10.0),5e-6));

  assert(!run(8,16,0,0.2,1,0,25,25,0,0,5));
  assert(cv_kinetics_last_error()==1);
  assert(!run(8,16,100,-0.2,1,0,25,25,0,0,5));
  assert(!run(8,16,100,0.2,-1,0,25,25,0,0,5));
  assert(!run(8,16,100,0.2,1,0,-273.15,25,0,1,5));
  assert(!run(8,16,100,0.2,1,0,25,25,-1,1,5));
  assert(!cv_kinetics_simulate(8,16,100,0.2,1,0,25,25,0,0,5,0.05,1));
  std::puts("CHEMVERSE kinetics engine: all tests passed");
}
