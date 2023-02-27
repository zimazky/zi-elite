/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _wgl_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./wgl.js */ \"./src/wgl.js\");\n\r\n\r\n(0,_wgl_js__WEBPACK_IMPORTED_MODULE_0__[\"default\"])();\r\n\r\n\n\n//# sourceURL=webpack://zi-elite/./src/index.js?");

/***/ }),

/***/ "./src/wgl.js":
/*!********************!*\
  !*** ./src/wgl.js ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ main)\n/* harmony export */ });\n\r\nfunction main() {\r\n  const canvas = document.querySelector('#glcanvas');\r\n  const gl = canvas.getContext('webgl2');\r\n\r\n  if (!gl) {\r\n    alert('Unable to initialize WebGL. Your browser or machine may not support it.');\r\n    return;\r\n  }\r\n\r\n  const shaderProgram = initShaderProgram(gl, 'vs.glsl', 'fs.glsl');\r\n\r\n  initBuffers(gl);\r\n\r\n  // Draw the scene\r\n  drawScene(gl, shaderProgram);\r\n}\r\n\r\nfunction loadShader(gl, type, url) {\r\n  let source;\r\n  fetch(url)\r\n    .then(data => data.text())\r\n    .then(data => source = data)\r\n  const shader = gl.createShader(type);\r\n  gl.shaderSource(shader, source.trim());\r\n  gl.compileShader(shader);\r\n  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {\r\n    alert(\"Ошибка компиляции шейдера: \" + gl.getShaderInfoLog(shader));\r\n    gl.deleteShader(shader);   \r\n    return null;\r\n  }\r\n  return shader;  \r\n}\r\n\r\nfunction initShaderProgram(gl, vsSourceUrl, fsSourceUrl) {\r\n  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSourceUrl);\r\n  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSourceUrl);\r\n  const shaderProgram = gl.createProgram();\r\n  gl.attachShader(shaderProgram, vertexShader);\r\n  gl.attachShader(shaderProgram, fragmentShader);\r\n  gl.linkProgram(shaderProgram);\r\n  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {\r\n    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));\r\n    return null;\r\n  }\r\n  return shaderProgram;\r\n}\r\n\r\nfunction initBuffers(gl) {\r\n  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());\r\n  const positions = [\r\n     1.0,  1.0,\r\n    -1.0,  1.0,\r\n     1.0, -1.0,\r\n    -1.0, -1.0,\r\n  ];\r\n  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);\r\n}\r\n\r\nfunction draw(gl, program) {\r\n  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);\r\n  gl.clearColor(0.0, 0.0, 0.0, 1.0); \r\n  gl.clear(gl.COLOR_BUFFER_BIT);\r\n\r\n  gl.useProgram(program);\r\n  const vertexPosition = gl.getAttribLocation(program, \"vertexPosition\");\r\n  gl.enableVertexAttribArray(vertexPosition);\r\n  gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);\r\n\r\n/*\r\n  // Set the shader uniforms\r\n  gl.uniformMatrix4fv(\r\n      programInfo.uniformLocations.projectionMatrix,\r\n      false,\r\n      projectionMatrix);\r\n  gl.uniformMatrix4fv(\r\n      programInfo.uniformLocations.modelViewMatrix,\r\n      false,\r\n      modelViewMatrix);\r\n*/\r\n  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);\r\n}\r\n\r\n\n\n//# sourceURL=webpack://zi-elite/./src/wgl.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.js");
/******/ 	
/******/ })()
;