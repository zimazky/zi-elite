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

/***/ "./src/wgl.ts":
/*!********************!*\
  !*** ./src/wgl.ts ***!
  \********************/
/***/ ((__unused_webpack_module, exports) => {

eval("\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nlet startTime;\r\nlet currentTime;\r\nasync function main() {\r\n    const canvas = document.querySelector('#glcanvas');\r\n    const gl = canvas.getContext('webgl2');\r\n    if (!gl) {\r\n        alert('Unable to initialize WebGL. Your browser or machine may not support it.');\r\n        return;\r\n    }\r\n    const program = await initShaderProgram(gl, 'shaders/vs.glsl', 'shaders/fs.glsl');\r\n    gl.useProgram(program);\r\n    const vertices = [\r\n        1.0, 1.0,\r\n        -1.0, 1.0,\r\n        1.0, -1.0,\r\n        -1.0, -1.0,\r\n    ];\r\n    const vertexData = new Float32Array(vertices);\r\n    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());\r\n    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);\r\n    const vertexPosition = gl.getAttribLocation(program, \"aVertexPosition\");\r\n    gl.enableVertexAttribArray(vertexPosition);\r\n    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);\r\n    // определение uniform переменных\r\n    const resolutionUniform = gl.getUniformLocation(program, 'uResolution');\r\n    const timeUniform = gl.getUniformLocation(program, 'uTime');\r\n    startTime = currentTime = performance.now() / 1000.;\r\n    // локальная функция\r\n    function draw() {\r\n        const lCurrentTime = performance.now() / 1000.;\r\n        const time = lCurrentTime - startTime;\r\n        const timeDelta = lCurrentTime - currentTime;\r\n        currentTime = lCurrentTime;\r\n        // задание uniform переменных\r\n        gl.uniform2f(resolutionUniform, canvas.width, canvas.height);\r\n        gl.uniform2f(timeUniform, time, timeDelta);\r\n        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);\r\n        requestAnimationFrame(draw);\r\n    }\r\n    draw();\r\n}\r\nexports[\"default\"] = main;\r\nasync function loadShader(gl, type, url) {\r\n    let response = await fetch(url);\r\n    let source = await response.text();\r\n    console.log(source);\r\n    const shader = gl.createShader(type);\r\n    gl.shaderSource(shader, source.trim());\r\n    gl.compileShader(shader);\r\n    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {\r\n        alert(\"Ошибка компиляции шейдера: \" + gl.getShaderInfoLog(shader));\r\n        gl.deleteShader(shader);\r\n        return null;\r\n    }\r\n    return shader;\r\n}\r\nasync function initShaderProgram(gl, vsSourceUrl, fsSourceUrl) {\r\n    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSourceUrl);\r\n    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSourceUrl);\r\n    const shaderProgram = gl.createProgram();\r\n    gl.attachShader(shaderProgram, await vertexShader);\r\n    gl.attachShader(shaderProgram, await fragmentShader);\r\n    gl.linkProgram(shaderProgram);\r\n    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {\r\n        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));\r\n        return null;\r\n    }\r\n    return shaderProgram;\r\n}\r\n\n\n//# sourceURL=webpack://zi-elite/./src/wgl.ts?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _wgl_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./wgl.ts */ \"./src/wgl.ts\");\n\r\n\r\n(0,_wgl_ts__WEBPACK_IMPORTED_MODULE_0__[\"default\"])();\r\n\r\n\n\n//# sourceURL=webpack://zi-elite/./src/index.js?");

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