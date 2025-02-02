// SPDX-FileCopyrightText: 2015 Ramsundar Shandilya <ramshandilya@gmail.com>
// SPDX-FileCopyrightText: 2023 Fabio Iotti <info@fabioiotti.com>
// SPDX-License-Identifier: MIT

// https://www.ramshandilya.com/blog/draw-smooth-curves/

type Point = [x: number, y: number, ...unknown[]];

export const computeControlPoints = (points: Point[]) => {
	const rhsArray: Point[] = [];
	const a: number[] = [];
	const b: number[] = [];
	const c: number[] = [];

	for (let i = 0; i < points.length-1; i++) {
		let rhsValueX = 0;
		let rhsValueY = 0;
	
		const P0 = points[i];
		const P3 = points[i+1];
	
		if (i == 0) {
			a.push(0);
			b.push(2);
			c.push(1);
		
			//rhs for first segment
			rhsValueX = P0[0] + 2*P3[0];
			rhsValueY = P0[1] + 2*P3[1];
		}
		else if (i == points.length-2) {
			a.push(2);
			b.push(7);
			c.push(0);
		
			//rhs for last segment
			rhsValueX = 8*P0[0] + P3[0];
			rhsValueY = 8*P0[1] + P3[1];
		}
		else {
			a.push(1);
			b.push(4);
			c.push(1);
		
			rhsValueX = 4*P0[0] + 2*P3[0];
			rhsValueY = 4*P0[1] + 2*P3[1];
		}
		
		rhsArray.push([rhsValueX, rhsValueY]);
	}

	for (let i = 1; i < points.length-1; i++) {
		const rhsValueX = rhsArray[i][0];
		const rhsValueY = rhsArray[i][1];
	
		const prevRhsValueX = rhsArray[i-1][0];
		const prevRhsValueY = rhsArray[i-1][1];
	
		const m = a[i]/b[i-1];
	
		const b1 = b[i] - m * c[i-1];
		b[i] = b1;
	
		const r2x = rhsValueX - m * prevRhsValueX
		const r2y = rhsValueY - m * prevRhsValueY
		
		rhsArray[i] = [r2x, r2y];
	}

	//Control Point of last segment
	let lastControlPointX = rhsArray[points.length-2][0]/b[points.length-2];
	let lastControlPointY = rhsArray[points.length-2][1]/b[points.length-2];

	const firstControlPoints: Point[] = [];

	firstControlPoints[points.length-2] = [lastControlPointX, lastControlPointY];

	for (let i = points.length-3; i >= 0; i--) {
		let nextControlPoint = firstControlPoints[i+1];
		if (nextControlPoint) {
			let controlPointX = (rhsArray[i][0] - c[i] * nextControlPoint[0])/b[i];
			let controlPointY = (rhsArray[i][1] - c[i] * nextControlPoint[1])/b[i];
		
			firstControlPoints[i] = [controlPointX, controlPointY];
		}
	}

	const secondControlPoints: Point[] = [];

	for (let i = 0; i < points.length-1; i++) {
		if (i == points.length-2) {
			const P3 = points[i+1]
			const P1 = firstControlPoints[i];
			if (P1 == null)
				continue;

			let controlPointX = (P3[0] + P1[0])/2;
			let controlPointY = (P3[1] + P1[1])/2;
		
			secondControlPoints.push([controlPointX, controlPointY]);
		} else {
			const P3 = points[i+1];
			const nextP1 = firstControlPoints[i+1];
			if (nextP1 == null)
				continue;
		
			let controlPointX = 2*P3[0] - nextP1[0];
			let controlPointY = 2*P3[1] - nextP1[1];
			secondControlPoints.push([controlPointX, controlPointY]);
		}
	}

	return [firstControlPoints, secondControlPoints];
};
