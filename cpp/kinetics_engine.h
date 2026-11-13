#ifndef CHEMVERSE_KINETICS_ENGINE_H
#define CHEMVERSE_KINETICS_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_KINETICS_MAX_SAMPLES = 257,
  CV_KINETICS_FIELDS_PER_SAMPLE = 6
};

/*
 * A + B -> products; 1:1 extent in a constant-volume homogeneous solution.
 * rate = k(T) * [A]^m * [B]^n.
 * Amounts: mmol; volume: mL; concentrations: mol/L; time: seconds;
 * k units follow the overall empirical order (1 - m - n); temperatures: C.
 * Empirical orders are inputs, not inferred from the balanced equation.
 */
const double *cv_kinetics_simulate(
  double amount_a_mmol, double amount_b_mmol, double volume_ml,
  double k_reference, double order_a, double order_b,
  double temperature_c, double reference_temperature_c,
  double activation_energy_kj_mol, int use_arrhenius,
  double duration_seconds, double maximum_step_seconds, int sample_count);

int cv_kinetics_last_error(void);
int cv_kinetics_last_steps(void);
double cv_kinetics_effective_k(void);
int cv_kinetics_atom_balance_ok(void);
int cv_kinetics_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
