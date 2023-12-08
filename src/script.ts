// SPDX-FileCopyrightText: 2023 Fabio Iotti <info@fabioiotti.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { computeControlPoints } from './smoothCurve';

const registerTouchPen = (canvas: HTMLCanvasElement) => {
	type Point = [x: number, y: number, ...unknown[]];
	type PointWithSize = [x: number, y: number, size: number, ...unknown[]];
	type PointWithSizeAndDuration = [x: number, y: number, size: number, duration: number, ...unknown[]];

	const ctx = canvas.getContext('2d', { desynchronized: true });
	if (!ctx)
		throw new Error("Failed to get context 2D.");

	const lerp = (a: number, b: number, x: number) => a * (1-x) + b * x;

	const length = (vec: Point) => Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);

	const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
	const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

	const normalize = (vec: Point): Point => {
		const invLen = 1 / length(vec);
		return [vec[0] * invLen, vec[1] * invLen];
	}

	const listenDown = (ev: MouseEvent | TouchEvent) => {
		ev.preventDefault();

		const points: PointWithSizeAndDuration[] = [];

		let lastX = (ev as MouseEvent).clientX ?? (ev as TouchEvent).touches[0]?.clientX;
		let lastY = (ev as MouseEvent).clientY ?? (ev as TouchEvent).touches[0]?.clientY;
		let lastTime = ev.timeStamp ?? new Date().getTime();

		let smoothSpeed = 0;

		points.push([lastX, lastY, 2.5, 0]);

		const listenMove = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();

			const clientX = (ev as MouseEvent).clientX ?? (ev as TouchEvent).changedTouches[0]?.clientX;
			const clientY = (ev as MouseEvent).clientY ?? (ev as TouchEvent).changedTouches[0]?.clientY;
			const timeStamp = ev.timeStamp ?? new Date().getTime();

			const duration = timeStamp - lastTime;
			const length = Math.sqrt(Math.pow(lastX - clientX, 2) + Math.pow(lastY - clientY, 2));
			const speed = duration == 0 ? 0 : (length / duration);

			smoothSpeed = lerp(smoothSpeed, speed, duration / 100);
			smoothSpeed = Math.max(0.25, Math.min(smoothSpeed, 1.5));

			ctx.lineJoin = 'round';

			//ctx.strokeStyle = 'black';
			//ctx.lineWidth = speed * 10;
			//ctx.beginPath();
			//ctx.moveTo(lastX, lastY);
			//ctx.lineTo(ev.clientX, ev.clientY);
			//ctx.stroke();

			ctx.strokeStyle = 'gray';
			ctx.lineWidth = smoothSpeed * 10;
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(clientX, clientY);
			ctx.stroke();

			//ctx.fillStyle = 'red';
			//ctx.clearRect(ev.clientX + 20, ev.clientY + 1, 30, -10);
			//ctx.fillText(`${speed.toFixed(2)}`, ev.clientX + 20, ev.clientY);

			//ctx.fillStyle = 'blue';
			//ctx.clearRect(ev.clientX + 50, ev.clientY + 1, 30, -10);
			//ctx.fillText(`${smoothSpeed.toFixed(2)}`, ev.clientX + 50, ev.clientY);

			points.push([clientX, clientY, smoothSpeed * 10, duration]);

			lastX = clientX;
			lastY = clientY;
			lastTime = timeStamp;
		};

		const listenUp = (ev: MouseEvent | TouchEvent) => {
			window.removeEventListener('mousemove', listenMove, { capture: true });
			window.removeEventListener('mouseup', listenUp, { capture: true });
			
			window.removeEventListener('touchmove', listenMove, { capture: true });
			window.removeEventListener('touchend', listenUp, { capture: true });
			window.removeEventListener('touchcancel', listenUp, { capture: true });
			
			listenMove(ev);

			const LIFTUP_DURATION = 50; // ms
			let liftupResidual = LIFTUP_DURATION;
			let index = points.length;
			while (--index > 0 && liftupResidual > 0) {
				points[index][2] = lerp(points[index][2], 2.5, liftupResidual / LIFTUP_DURATION);
				liftupResidual -= points[index][3];
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			drawPoints(points);
		};

		window.addEventListener('mousemove', listenMove, { capture: true, passive: true });
		window.addEventListener('mouseup', listenUp, { capture: true, passive: true });

		window.addEventListener('touchmove', listenMove, { capture: true, passive: true });
		window.addEventListener('touchend', listenUp, { capture: true, passive: true });
		window.addEventListener('touchcancel', listenUp, { capture: true, passive: true });
	};

	const drawPoints1 = (points: PointWithSize[], debug = false) => {
		let controlPoint: Point = points[0];

		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			const prev = points[i - 1];
			const prev2 = points[i - 2] ?? prev;
			const next = points[i + 1] ?? point;

			const len = length(sub(point, prev));

			if (debug) {
				ctx.fillStyle = '#0000ff88';
				ctx.fillRect(controlPoint[0] - 5, controlPoint[1] - 5, 10, 10);
			}

			ctx.strokeStyle = 'black';
			ctx.lineWidth = point[2];
			ctx.beginPath();
			ctx.moveTo(prev[0], prev[1]);
			ctx.lineTo(point[0], point[1]);
			//ctx.bezierCurveTo(prev[0]*2 - prev2[0], prev[1]*2 - prev2[1], point[0]*2 - next[0], point[1]*2 - next[1], point[0], point[1]);
			//ctx.quadraticCurveTo(controlPoint[0], controlPoint[1], point[0], point[1]);
			ctx.stroke();

			const vec = normalize(sub(point, controlPoint));
			controlPoint = [vec[0] * len * 0.4 + point[0], vec[1] * len * 0.4 + point[1]];
		}

		if (debug) {
			for (const point of points) {
				ctx.fillStyle = '#ff0000cc';
				ctx.fillRect(point[0] - point[2]*.5, point[1] - point[2]*.5, point[2], point[2]);
			}
		}
	};

	const drawPoints2 = (points: PointWithSize[], debug = false) => {
		const [firstControlPoints, secondControlPoints] = computeControlPoints(points);
	
		for (let i = 1; i < points.length; i++) {
			const prevPoint = points[i-1];
			const point = points[i];
			const controlPoint1 = firstControlPoints[i-1];
			const controlPoint2 = secondControlPoints[i-1];

			if (debug) {
				ctx.fillStyle = '#0000ff88';
				ctx.fillRect(controlPoint1[0] - 5, controlPoint1[1] - 5, 10, 10);

				ctx.fillStyle = '#00ff0088';
				ctx.fillRect(controlPoint2[0] - 5, controlPoint2[1] - 5, 10, 10);
			}

			ctx.strokeStyle = 'black';
			ctx.lineWidth = point[2];
			ctx.beginPath();
			ctx.moveTo(prevPoint[0], prevPoint[1]);
			ctx.bezierCurveTo(controlPoint1[0], controlPoint1[1], controlPoint2[0], controlPoint2[1], point[0], point[1]);
			ctx.stroke();
		}

		if (debug) {
			for (const point of points) {
				ctx.fillStyle = '#ff0000cc';
				ctx.fillRect(point[0] - point[2]*.5, point[1] - point[2]*.5, point[2], point[2]);
			}
		}
	};

	const drawPoints = drawPoints2;

	canvas.addEventListener('mousedown', listenDown);
	canvas.addEventListener('touchstart', listenDown);

	//#region DEBUG

	drawPoints([
		[ 40,  50,  1],
		[ 40, 130, 15],
		[100, 170,  5],
		[200, 110, 15],
		[220,  30,  5],
	], true);

	drawPoints([
		[300,  50,  1],
		[300, 100, 15],
		[300, 150,  5],
		[350, 150, 15],
		[400, 150,  5],
		[450, 150, 15],
		[500, 150,  5],
	], true);

	drawPoints([
		[104 - 50, 143 + 130,  2.500],
		[109 - 50, 137 + 130,  2.500],
		[117 - 50, 134 + 130,  2.979],
		[135 - 50, 125 + 130,  4.455],
		[157 - 50, 112 + 130,  6.164],
		[165 - 50, 107 + 130,  6.121],
		[166 - 50, 106 + 130,  5.467],
		[166 - 50, 108 + 130,  3.042],
		[166 - 50, 111 + 130,  3.251],
		[166 - 50, 122 + 130,  3.831],
		[164 - 50, 138 + 130,  4.830],
		[161 - 50, 163 + 130,  6.527],
		[155 - 50, 180 + 130,  7.285],
		[146 - 50, 202 + 130,  8.569],
		[138 - 50, 218 + 130,  8.816],
		[126 - 50, 229 + 130,  8.945],
		[113 - 50, 239 + 130,  9.243],
		[105 - 50, 243 + 130,  8.659],
		[102 - 50, 243 + 130,  7.660],
		[101 - 50, 243 + 130,  6.764],
		[ 96 - 50, 242 + 130,  5.921],
		[ 92 - 50, 238 + 130,  5.598],
		[ 87 - 50, 229 + 130,  5.732],
		[ 84 - 50, 222 + 130,  4.831],
		[ 86 - 50, 220 + 130,  4.341],
		[ 98 - 50, 216 + 130,  4.911],
		[113 - 50, 210 + 130,  5.790],
		[142 - 50, 204 + 130,  7.825],
		[168 - 50, 202 + 130,  9.102],
		[212 - 50, 194 + 130, 11.754],
		[237 - 50, 189 + 130, 12.423],
		[267 - 50, 184 + 130, 13.476],
		[288 - 50, 181 + 130, 13.441],
		[300 - 50, 178 + 130, 12.528],
		[305 - 50, 175 + 130, 11.106],
		[307 - 50, 173 + 130,  9.612],
		[309 - 50, 169 + 130,  8.521],
		[310 - 50, 165 + 130,  7.485],
		[313 - 50, 159 + 130,  7.033],
		[313 - 50, 156 + 130,  6.137],
		[313 - 50, 155 + 130,  5.562],
		[314 - 50, 155 + 130,  3.938],
		[314 - 50, 156 + 130,  2.500],
		[312 - 50, 159 + 130,  2.785],
		[303 - 50, 172 + 130,  3.921],
		[288 - 50, 202 + 130,  6.177],
		[279 - 50, 224 + 130,  7.504],
		[267 - 50, 251 + 130,  9.333],
		[259 - 50, 275 + 130, 10.369],
		[249 - 50, 304 + 130, 11.778],
		[243 - 50, 322 + 130, 11.790],
		[242 - 50, 346 + 130, 11.834],
		[243 - 50, 354 + 130, 10.747],
		[247 - 50, 357 + 130,  8.684],
		[258 - 50, 361 + 130,  6.237],
		[270 - 50, 362 + 130,  4.038],
		[270 - 50, 362 + 130,  2.500]
	], false);

	drawPoints([
		[319, 342,  2.500],
		[326, 342,  2.500],
		[335, 342,  3.000],
		[355, 338,  4.559],
		[372, 335,  5.556],
		[398, 327,  7.387],
		[423, 317,  8.676],
		[434, 308,  8.622],
		[440, 302,  8.177],
		[440, 297,  7.287],
		[439, 290,  6.901],
		[434, 287,  6.311],
		[430, 286,  5.777],
		[427, 286,  5.094],
		[419, 289,  5.185],
		[411, 295,  5.303],
		[395, 306,  6.449],
		[384, 316,  6.839],
		[372, 329,  7.514],
		[365, 339,  7.532],
		[357, 353,  7.864],
		[353, 365,  7.950],
		[351, 376,  7.875],
		[351, 384,  7.336],
		[356, 393,  6.311],
		[364, 399,  6.302],
		[373, 401,  6.215],
		[392, 403,  7.131],
		[417, 403,  8.490],
		[446, 403, 10.032],
		[472, 395, 10.745],
		[486, 389, 10.549],
		[501, 379, 10.770],
		[517, 367, 10.939],
		[538, 348, 12.130],
		[554, 333, 12.261],
		[561, 322, 11.603],
		[561, 317, 10.246],
		[555, 313,  9.328],
		[543, 312,  9.040],
		[519, 312,  9.993],
		[506, 318,  9.826],
		[488, 333, 10.597],
		[472, 347, 10.921],
		[460, 369, 11.789],
		[448, 384, 11.824],
		[432, 404, 12.493],
		[425, 420, 12.240],
		[424, 444, 11.215],
		[424, 450, 11.366],
		[431, 460, 10.541],
		[460, 478, 11.108],
		[486, 481, 11.463],
		[525, 484,  9.767],
		[557, 484,  6.448],
		[571, 481,  5.500],
		[571, 481,  2.500]
	], false);

	//#endregion
};

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
registerTouchPen(canvas);
