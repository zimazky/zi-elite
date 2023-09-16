
/** 
 * Функция гладкой ступени, значение x отображается на диапазон значений от 0. до 1.
 *   min - нижняя граница ступени, ниже которой результат равен 0.
 *   max - верхняя граница ступени, выше которой результат равен 1.
 */
export function smoothstep(min:number, max:number, x:number): number {
  if(x <= min) return 0.;
  if(x >= max) return 1.;
  const d = (x-min)/(max-min);
  return d*d*(3.-2.*d);
}

/** Функция линейной интерполяции */
export function mix(a: number, b: number, x: number): number {
  return a + x*(b - a);
}

/** Перевод из градусов в радианы */
export function rad(x: number): number {
  return Math.PI*x/180.;
}

/** Перевод из радиан в градусы */
export function grad(x: number): number {
  return x*180./Math.PI;
}