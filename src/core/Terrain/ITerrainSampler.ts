import { Vec3 } from 'src/shared/libs/vectors'

/** Интерфейс генератора ландшафта */
export default interface ITerrainSampler {
  /** Функция проверяющая превышена ли высота текущей точки над максимальной высотой ландшафта */
  isHeightGreaterMax(r: Vec3): boolean
  /** Функция определения высоты над поверхностью заданной точки */
  height(r: Vec3): number
  /** Функция определения нормали к поверхности под заданной точкой (в точке пересечения отвеса) */
  normal(r: Vec3): Vec3
}