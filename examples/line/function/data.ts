/**
 * Chest circumferences, in inches, of 5,738 Scottish militiamen - the
 * measurements Quetelet used to argue that human variation follows the same
 * error curve astronomers used for their observations, and so the dataset
 * behind the idea of the "average man".
 *
 * Quetelet, "Lettres sur la theorie des probabilites" (1846), via
 * HistData::ChestSizes (see NOTICE); 16 rows, one per whole inch from 33 to
 * 48. `share` is that row's count divided by 5,738 - and because the classes
 * are one inch wide, a share is directly comparable with a density, which is
 * what lets Quetelet's claim be drawn as a curve over the counts.
 *
 * The mean and standard deviation of the table are 39.83 and 2.05 inches.
 */
export const chestSizes: { chest: number; count: number; share: number }[] = [
  { chest: 33, count: 3, share: 0.0005 },
  { chest: 34, count: 18, share: 0.0031 },
  { chest: 35, count: 81, share: 0.0141 },
  { chest: 36, count: 185, share: 0.0322 },
  { chest: 37, count: 420, share: 0.0732 },
  { chest: 38, count: 749, share: 0.1305 },
  { chest: 39, count: 1073, share: 0.187 },
  { chest: 40, count: 1079, share: 0.188 },
  { chest: 41, count: 934, share: 0.1628 },
  { chest: 42, count: 658, share: 0.1147 },
  { chest: 43, count: 370, share: 0.0645 },
  { chest: 44, count: 92, share: 0.016 },
  { chest: 45, count: 50, share: 0.0087 },
  { chest: 46, count: 21, share: 0.0037 },
  { chest: 47, count: 4, share: 0.0007 },
  { chest: 48, count: 1, share: 0.0002 },
];
