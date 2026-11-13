#ifndef CHEMVERSE_CHEMISTRY_CORE_H
#define CHEMVERSE_CHEMISTRY_CORE_H
#ifdef __cplusplus
extern "C" {
#endif
typedef struct CvReactionResult {
  double progress;
  double extent_mmol;
  double acetic_acid_remaining_mmol;
  double sodium_bicarbonate_remaining_mmol;
  double sodium_acetate_mmol;
  double water_mmol;
  double carbon_dioxide_mmol;
  int limiting_reagent; /* 0 = equal, 1 = acid, 2 = bicarbonate */
  int atom_balance_ok;
  int error_code; /* 0 = ok, 1 = invalid input */
} CvReactionResult;
/* CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2; amounts are millimoles. */
const CvReactionResult *cv_calculate_reaction(double acetic_acid_mmol,
                                              double sodium_bicarbonate_mmol,
                                              double progress);
double cv_demo_progress(double elapsed_seconds);
int cv_reaction_is_balanced(void);
int cv_engine_version(void);
#ifdef __cplusplus
}
#endif
#endif
