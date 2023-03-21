
#define ATM_MODULE
// ----------------------------------------------------------------------------
// Atmosphere scattering constants
// ----------------------------------------------------------------------------

const vec3 LIGHT_INTENSITY = vec3(12.); // Интенсивность света
const vec3 PLANET_POS = vec3(0.);   // Положение планеты
const float PLANET_RADIUS = 6371e3; // Радиус планеты
const float PLANET_RADIUS_SQR = PLANET_RADIUS*PLANET_RADIUS; // Квадрат радиуса планеты
const float ATM_RADIUS = 6471e3;  // Радиус атмосферы
const float ATM_RADIUS_SQR = ATM_RADIUS*ATM_RADIUS; // Квадрат радиуса атмосферы

const vec3 RAY_BETA = vec3(5.5e-6, 13.0e-6, 22.4e-6); // rayleigh, affects the color of the sky
const vec3 MIE_BETA = vec3(2e-7);     // mie, affects the color of the blob around the sun
const vec3 AMBIENT_BETA = vec3(0.0);  // ambient, affects the scattering color when there is no lighting from the sun
const vec3 ABSORPTION_BETA = vec3(2.04e-5, 4.97e-5, 1.95e-6); // what color gets absorbed by the atmosphere (Due to things like ozone)
const float G = 0.996; // mie scattering direction, or how big the blob around the sun is
// and the heights (how far to go up before the scattering has no effect)
const float HEIGHT_RAY = 8e3;        // rayleigh height
const float HEIGHT_MIE = 1.2e3;      // and mie
const float HEIGHT_ABSORPTION = 30e3; // at what height the absorption is at it's maximum
const float ABSORPTION_FALLOFF = 4e3; // how much the absorption decreases the further away it gets from the maximum height
// and the steps (more looks better, but is slower)
// the primary step has the most effect on looks
const int PRIMARY_STEPS = 32; // primary steps, affects quality the most
