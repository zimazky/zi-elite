/** Функция загрузки файла */
async function loadFile(sourceUrl: string): Promise<string> {
  let response = await fetch(sourceUrl);
  let source = await response.text();
  return source;
}

export class ObjDoc {
  //filename: string = null;
  verticies: number[] = [];
  normals: number[] = [];
  vertexIds: number[] = [];
  
  async init(url: string) {
    const source = await loadFile(url);
    this.parseObj(source);
  }

  parseObj(source: string) {
    const strings = source.split('\n');
    const normalsT : number[] = [];
    const normalIds : number[] = [];
    strings.forEach((s)=>{
      const [k, v1, v2, v3] = s.split(' ');
      switch(k) {
        case 'v':
          this.verticies.push(parseFloat(v1)*0.5)
          this.verticies.push(parseFloat(v2)*0.5)
          this.verticies.push(parseFloat(v3)*0.5)
          break;
        case 'vn':
          normalsT.push(parseFloat(v1));
          normalsT.push(parseFloat(v2));
          normalsT.push(parseFloat(v3));
          break;
        case 'f':
          let [f1, f2, f3] = v1.split('/');
          this.vertexIds.push(parseInt(f1)-1);
          normalIds.push(parseInt(f3)-1);
          [f1, f2, f3] = v2.split('/');
          this.vertexIds.push(parseInt(f1)-1);
          normalIds.push(parseInt(f3)-1);
          [f1, f2, f3] = v3.split('/');
          this.vertexIds.push(parseInt(f1)-1);
          normalIds.push(parseInt(f3)-1);
      }
    })
    //console.log(this.vertexIds, normalsT, normalIds);
    normalIds.forEach(i=>{
      this.normals.push(normalsT[i*3]);
      this.normals.push(normalsT[i*3+1]);
      this.normals.push(normalsT[i*3+2]);
    })
  }
}