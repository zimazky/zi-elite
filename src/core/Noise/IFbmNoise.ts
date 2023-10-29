import { Vec2 } from "src/shared/libs/vectors"
import { AutoDiff3 } from "src/shared/libs/AutoDiff"

export interface IFbmNoise {
  /**
   * Генерация высоты с помощью fbm и c вычислением нормали
   * @param p - координаты точки для которой определяется высота
   * возвращает AutoDiff3 с высотой и вектором нормали
   */
  fbm(p: Vec2): AutoDiff3
}