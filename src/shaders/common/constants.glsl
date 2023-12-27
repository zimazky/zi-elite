#define CONST_MODULE

// Просмотр ошибки карты глубины буфера A
//#define DEPTH_ERROR_VIEW
#define RAYCAST_ITERATIONS_VIEW
//#define SHADOWS_ITERATIONS_VIEW
//#define SHADOW_DISTANCE_VIEW


// Максимальная дальность отображения ландшафта (Можно задавать максимально большое число, деленное на коэффициент 1.01, который используется для гарантированного превышения предела при сохранении результата. Дистанции 6e11 достаточно чтобы Юпитер стал меньше пикселя)
const float MAX_TERRAIN_DISTANCE = 500000e10;

// Интенсивность солнечного света
const vec3 LIGHT_INTENSITY = vec3(5.);

const float PI = 3.1415926535897932384626433832795;
const float SQRT2 = 1.4142135623730950488016887242097;
const float SQRT3 = 1.7320508075688772935274463415059;
const float ONE_OVER_SQRT2 = 0.70710678118654752440084436210485;
const float ONE_OVER_SQRT3 = 0.57735026918962576450914878050196;

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;

#ifdef RAYCAST_ITERATIONS_VIEW
#define TEST_VIEW
#endif

#ifdef SHADOWS_ITERATIONS_VIEW
#define TEST_VIEW
#endif

#ifdef SHADOW_DISTANCE_VIEW
#define TEST_VIEW
#endif
