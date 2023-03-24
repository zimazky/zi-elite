/** 
 * Функция загрузки программы шейдера с препроцессингом.
 * Препроцессинг заключается в сборке программы из разных модулей (файлов) по директиве #include
 * Ограничение вложенности - 10 уровней
 * */
export async function preprocess(baseUrl: string, sourceUrl: string, level: number = 0): Promise<string> {
  if(level > 10) throw new Error('Превышено возможное количество уровней вложения модулей программы');
  const source = await loadShader(baseUrl + '/' + sourceUrl);
  const strings = source.split('\n');
  const nstrings = strings.map(async (s)=>{
    if(s.startsWith('#include')) {
      const [_, url] = s.split(/\s/,2);
      return await preprocess(baseUrl, url.replace(/["']/g, ''), level + 1);
    }
    else return s;
  })
  return (await Promise.all(nstrings)).join('\n');
}

/** Функция загрузки модуля программы */
async function loadShader(sourceUrl: string): Promise<string> {
  let response = await fetch(sourceUrl);
  let source = await response.text();
  return source;
}
