
export function smoothstep(min:number, max:number, x:number): number {
  if(x < min) return 0.;
  if(x >= max) return 1.;
  const d = (x-min)/(max-min);
  return d*d*(3.-2.*d);
}
