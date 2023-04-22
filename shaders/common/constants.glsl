#define CONST_MODULE

// Просмотр ошибки карты глубины буфера A
//#define DEPTH_ERROR_VIEW
//#define RAYCAST_ITERATIONS_VIEW
//#define SHADOWS_ITERATIONS_VIEW

// Максимальная дальность отображения ландшафта
const float MAX_TERRAIN_DISTANCE = 30000.;
// Mаксимальная высота ландшафта
const float MAX_TRN_ELEVATION = 2300.;//1.8*H_SCALE; 

// Интенсивность солнечного света
const vec3 LIGHT_INTENSITY = vec3(15.);

const float PI = 3.14159265358979323846;

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;
