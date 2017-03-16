window.evil = (function(){"use strict";
function varint (v, value) {
	while (true) {
		var b = value & 127;
		value >>= 7;
		if ((value == 0 && ((b & 0x40) == 0)) || ((value == -1 && ((b & 0x40) == 0x40)))) {
			return v.push(b);
		}
		else {
			v.push(b | 128);
		}
	}
}
 
 
function varuint (v, value, padding) {
	padding |= 0;
	do {
		var b = value & 127;
		value >>= 7;
		if (value != 0 || padding > 0) {
			b |= 128;
		}
		v.push(b);
		padding--;
	} while (value != 0 || padding > -1);
}
 
function pushArray(sink, data) {
	return Array.prototype.push.apply(sink, data);
}
 
var exports = {};
 
var weaveMap = [4, 1, 16, 2, 64, 8, 128, 32];
function weave(x) {
	var mask = 1, answer = 0;
	for (var i=0; i<8; i++) {
		if ((x&mask))
			answer |= weaveMap[i];
		mask <<= 1;
	}
	return answer;
}
 
exports.runSource = function(srcTxt, imp) {
	var codemem = new WebAssembly.Memory({ initial: 1 });
	var wheelmem = imp.m;
	var wheel = new Uint8Array(wheelmem.buffer);
	var code = new Uint8Array(codemem.buffer);
	for (var i=0; i<256; i++) {
		wheel[i] = code[i] = weave(i);
	}
	for (var i=0, j=261; i<srcTxt.length; i++) {
		code[j++] = srcTxt.charCodeAt(i)|0;
	}
	return runSourceRec(imp, codemem, code, wheelmem, wheel);
}

function runSourceRec(imp, codemem, code, wheelmem, wheel) {
	runEvil(imp, code).then(f => {
		var x = f.instance.exports.f();
		if (~x) {
			// TODO load registers, pass through
			imp.m = codemem;
			codemem = wheelmem;
			wheelmem = imp.m;
			return runSourceRec(imp, wheelmem, wheel, codemem, code);
		}
	});
}
 
function runEvil(imports, src) {
	var mem = new Uint8Array(imports[""].m.buffer);
	var bc = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
 
	bc.push(1); // Types
 
	var type = [2];
 
	// i32 -> void
	type.push(0x60, 1, 0x7f, 0);
	// void -> i32
	type.push(0x60, 0, 1, 0x7f);
 
	varuint(bc, type.length, 4);
	pushArray(bc, type);
 
	bc.push(2); // Imports
 
	var imp = [3];
	varuint(imp, 0);
	imp.push(1, "p".charCodeAt(0), 0, 0);
 
	varuint(imp, 0);
	imp.push(1, "g".charCodeAt(0), 0, 1);
 
	varuint(imp, 0);
	imp.push(1, "m".charCodeAt(0), 2, 0);
	varuint(imp, 1);
 
	varuint(bc, imp.length, 4);
	pushArray(bc, imp);
 
	bc.push(3); // Funcs
 
	var functions = [1];
 
	// types: sequence of indices into the type section
	varuint(functions, 1);
 
	varuint(bc, functions.length, 4);
	pushArray(bc, functions);
 
	bc.push(7); // Exports
 
	var exports = [1];
 
	// entries: repeated export entries as described below
 
	exports.push(1, "f".charCodeAt(0), 0, 2);
 
	varuint(bc, exports.length, 4);
	pushArray(bc, exports);
 
	bc.push(10); // Codes
 
	var code = [1];
 
	var body = [];
 
	// locals
	varuint(body, 1);
	varuint(body, 5);
	// 0 A, 1 Pp, 2 Wp, 3 Wc, 4 T, 5 M
	body.push(0x7f);
 
	var echo = false, pts = [], pt0 = body.length;
	for (var i=261; i<src.length; i++) {
		var c = src[i];
		switch (c) mainswitch: {
			case 0:i=src.length;break;
			case 97:body.push(0x20, 0, 0x41, 1, 0x6a, 0x21, 0);break;
			case 98: // b
				pts.push(0, body.length);
				break;
			case 99: // c insert wheel
				body.push(0x20, 3, 0x22, 4, 0x41, 1, 0x6a, 0x21, 3, 0x03, 0x20, 3, 0x20, 2, 0x46, 0x0d, 0, 0x20, 4, 0x41, 1, 0x6a, 0x20, 4, 0x2d, 0, 0, 0x3a, 0, 0, 0x0b, 0x20, 4, 0x41, 0, 0x3a, 0, 0);
				break;
			case 100:body.push();break;
			case 101:body.push(0x41, 0, 0x20, 0, 0x41);
				varint(body, 255);
				body.push(0x71, 0x2d, 0, 0, 0x21, 0);break;
			case 102: // f
				pts.push(1, body.length);
				break;
			case 103:
				body.push(0x20, 1, 0x2d, 0);
				varint(body, 256);
				body.push(0x21, 0);
				break;
			case 104:body.push(0x41, 0, 0x20, 1, 0x41, 1, 0x6a, 0x20, 1, 0x41, 5, 0x46, 0x1b, 0x21, 1);break;
			case 105:body.push(0x41, 0, 0x20, 2, 0x41, 1, 0x6a, 0x20, 2, 0x20, 3, 0x46, 0x1b, 0x21, 2);break;
			case 106: // j
				body.push(0x0b);
				pts.push(2, body.length);
				break;
			case 107: // k
				body.push(0x20, 1, 0x20, 0, 0x3a, 0);
				varint(body, 256);
				break;
			case 108: // l
				body.push(0x20, 0, 0x20, 2, 0x2d, 0);
				varint(body, 261);
				body.push(0x21, 0, 0x3a, 0);
				varint(body, 261);
				break;
			case 109: // m
				body.push(0x0b);
				pts.push(3, body.length);
				break;
			case 110:body.push(0x20, 1, 0x41, 1, 0x6b, 0x41, 5, 0x20, 1, 0x1b, 0x21, 1);break;
			case 111:body.push(0x20, 2, 0x41, 1, 0x6b, 0x20, 3, 0x20, 2, 0x1b, 0x21, 2);break;
			case 112: // p
				body.push(0x20, 2, 0x2d, 0);
				varint(body, 261);
				body.push(0x21, 0);
				break;
			case 113: // q
				body.push(0x20, 0, 0x3a, 0, 0, 0x20, 1, 0x3a, 0, 1, 0x20, 2, 0x3a, 0, 2, 0x20, 3, 0x3a, 0, 3, 0x20, 5, 0x3a, 0, 4, 0x41);
				varint(body, i);
				body.push(0x0f);
				break;
			case 114:body.push(0x10, 1, 0x21, 0);break;
			case 115:case 116: // s|t
				do {
					if (src[i+1] == c) { // SS | TT => cancel
						i+=1;
						break mainswitch;
					}
					while (src[i+1] == (c==115?116:115)) { // TS == S
						c=src[i+1];
						i+=1;
					}
				} while (src[i-1] == c);
				if (src[i] == c) {
				}
				if (src[i+1] >= 97 && src[i+1] <= 122 && src[i+1] != 106 && src[i+1] != 109) {
					body.push(0x20, 0);
					if (c == 116) body.push(0x45);
					body.push(0x04, 0x40);
					echo=true;
				}
				break;
			case 117:body.push(0x20, 0, 0x41, 1, 0x6b, 0x21, 0);break;
			case 118:
				body.push(0x20, 1, 0x20, 0, 0x20, 1, 0x2d, 0);
				varint(body, 256);
				body.push(0x21, 0, 0x3a, 0);
				varint(body, 256);
				break;
			case 119:body.push(0x20, 0, 0x10, 0);break;
			case 120:body.push(0x20, 5, 0x45, 0x21, 5);break;
			case 121:
				body.push(0x20, 2, 0x20, 0, 0x3a, 0);
				varint(body, 261);
				break;
			case 122:body.push(0x41, 0, 0x21, 0);break;
		}
		if (echo) {
			body.push(0x0b);
			echo = false;
		}
	}

	for (var i=pts.length-2; i >= 0; i-=2) {
		switch (pts[i]) {
			case 0:break;
			case 1:break;
			case 2:break;
			case 3:break;
		}
	}
	for (var i=0; i<= pts.length; i+=2) {
		body.splice(pt0, 0, 0x02);
	}
 
	body.push(0x41, 0x7f, 0x0f);
	body.push(0x0b);
	console.log(body);
 
	varuint(code, body.length, 4);
	pushArray(code, body);
 
	varuint(bc, code.length, 4);
	pushArray(bc, code);
 
	return WebAssembly.instantiate(new Uint8Array(bc), imports);
}
 
return exports;})();
 
(function(){"use strict";
var taSrc = document.getElementById("taSrc");
var prOut = document.getElementById("prOut");
document.getElementById("btnGo").addEventListener("click", (s, e) => {
	// 0x0100-0x0105 pental
	// 0x0106-0xffff wheel
	var imp = {
		"": {
			p: x => { console.log(x); prOut.textContent += String.fromCharCode(x&255) },
			g: () => prompt("Character", "").charCodeAt(0)|0,
			m: new WebAssembly.Memory({ initial: 1 }),
		}
	};
	prOut.textContent = "";
	evil.runSource(taSrc.value, imp);
});
})();
