import { hexToRgba, poissonDiskSampling } from './utils';

describe('shared/utils', () => {
  describe('hexToRgba', () => {
    // Spy on console.warn before all tests in this suite
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    // Restore the original console.warn after each test
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should convert 3-digit hex to rgba', () => {
      expect(hexToRgba('#fff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('#000')).toBe('rgba(0, 0, 0, 1)');
      expect(hexToRgba('#f00')).toBe('rgba(255, 0, 0, 1)');
    });

    it('should convert 6-digit hex to rgba', () => {
      expect(hexToRgba('#ffffff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('#000000')).toBe('rgba(0, 0, 0, 1)');
      expect(hexToRgba('#ff0000')).toBe('rgba(255, 0, 0, 1)');
    });

    it('should handle hex codes without #', () => {
      expect(hexToRgba('fff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('ff0000')).toBe('rgba(255, 0, 0, 1)');
    });

    it('should apply alpha value correctly', () => {
      expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
      expect(hexToRgba('ff0000', 0.75)).toBe('rgba(255, 0, 0, 0.75)');
    });

    it('should return transparent black and warn for invalid hex codes', () => {
      expect(hexToRgba('#ff')).toBe('rgba(0, 0, 0, 0)');
      expect(warnSpy).toHaveBeenCalledWith('Invalid hex color provided to hexToRgba: #ff');
      expect(hexToRgba('12345')).toBe('rgba(0, 0, 0, 0)');
      expect(warnSpy).toHaveBeenCalledWith('Invalid hex color provided to hexToRgba: 12345');
      expect(hexToRgba('#gggggg')).toBe('rgba(0, 0, 0, 0)');
      expect(warnSpy).toHaveBeenCalledWith('Could not parse hex color: gggggg');
      // Test case where parsing results in NaN
      // jest.spyOn(Number, 'parseInt').mockReturnValueOnce(NaN); // This is harder to mock reliably
      // expect(hexToRgba('#abcdef')).toBe('rgba(0, 0, 0, 0)');
      // expect(warnSpy).toHaveBeenCalledWith('Could not parse hex color: abcdef');
    });

     it('should handle non-string input gracefully (though TS should prevent this)', () => {
       // @ts-expect-error Testing invalid input type
       expect(hexToRgba(null)).toBe('rgba(0, 0, 0, 0)');
       // @ts-expect-error Testing invalid input type
       expect(hexToRgba(undefined)).toBe('rgba(0, 0, 0, 0)');
       // @ts-expect-error Testing invalid input type
       expect(hexToRgba(123)).toBe('rgba(0, 0, 0, 0)');
     });
  });

  describe('poissonDiskSampling', () => {
    const width = 100;
    const height = 100;
    const minDistance = 10;

    it('should generate points within the specified bounds', () => {
      const points = poissonDiskSampling(width, height, minDistance);
      points.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width); // Allow points exactly on the edge
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height); // Allow points exactly on the edge
      });
    });

    it('should respect the maxPoints limit', () => {
      const maxPoints = 5;
      const points = poissonDiskSampling(width, height, minDistance, 30, maxPoints);
      // It might generate fewer points if space runs out, but never more
      expect(points.length).toBeLessThanOrEqual(maxPoints);
    });

    it('should maintain minimum distance between points', () => {
      const points = poissonDiskSampling(width, height, minDistance);
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i][0] - points[j][0];
          const dy = points[i][1] - points[j][1];
          const distSq = dx * dx + dy * dy;
          // Allow for minor floating point inaccuracies
          expect(distSq).toBeGreaterThanOrEqual(minDistance * minDistance - 1e-9);
        }
      }
    });

    it('should return fewer points if area is too small for minDistance', () => {
        const smallWidth = 5;
        const smallHeight = 5;
        // Only one point should fit if minDistance is large
        const points = poissonDiskSampling(smallWidth, smallHeight, minDistance);
        expect(points.length).toBeLessThanOrEqual(1); // Might be 0 or 1
    });

    it('should handle zero width or height', () => {
        expect(poissonDiskSampling(0, height, minDistance)).toEqual([]);
        expect(poissonDiskSampling(width, 0, minDistance)).toEqual([]);
        expect(poissonDiskSampling(0, 0, minDistance)).toEqual([]);
    });

    // Note: Testing the restrictedArea with letter mask is complex without canvas/font rendering.
    // This test only checks the basic bounding box avoidance.
    it('should avoid the basic bounding box of a restricted area', () => {
        const restrictedArea = { x: 40, y: 40, size: 20, margin: 5 }; // Box from (35,35) to (65,65)
        const points = poissonDiskSampling(width, height, minDistance, 30, 100, restrictedArea);
        points.forEach(([x, y]) => {
            const isInsideRestricted = x >= 35 && x <= 65 && y >= 35 && y <= 65;
            expect(isInsideRestricted).toBe(false);
        });
    });

     it('should generate some points even with a restricted area', () => {
         const restrictedArea = { x: 10, y: 10, size: 10, margin: 5 };
         const points = poissonDiskSampling(width, height, minDistance, 30, 50, restrictedArea);
         // Expect *some* points, just not inside the restricted zone
         expect(points.length).toBeGreaterThan(0);
     });
  });

  // Add tests for getSimulationColors if they don't exist,
  // ensuring they don't check for the removed themeToggle properties.
  // Example structure:
  /*
  describe('getSimulationColors', () => {
    const mockParamsLight = {
      backgroundColor: '#aaaaaa',
      blobFillColor: '#bbbbbb',
      blobFillOpacity: 0.5,
      blobBorderColor: '#cccccc',
      letterColor: '#dddddd',
      // No theme toggle params
    };
    const mockParamsDark = {
      darkBackgroundColor: '#111111',
      darkBlobFillColor: '#222222',
      darkBlobFillOpacity: 0.6,
      darkBlobBorderColor: '#333333',
      darkLetterColor: '#444444',
      // No theme toggle params
    };

    it('should return correct colors for light theme', () => {
      const colors = getSimulationColors({ ...mockParamsLight, ...mockParamsDark }, 'light');
      expect(colors.backgroundColor).toBe('#aaaaaa');
      expect(colors.blobFill).toBe('rgba(187, 187, 187, 0.5)'); // Example RGBA
      expect(colors.blobBorder).toBe('#cccccc');
      expect(colors.letterColor).toBe('#dddddd');
      expect(colors.borderColor).toBe('#cccccc');
      // Ensure themeToggle properties are not present
      expect(colors).not.toHaveProperty('themeToggleBg');
      expect(colors).not.toHaveProperty('themeToggleIcon');
    });

    it('should return correct colors for dark theme', () => {
       const colors = getSimulationColors({ ...mockParamsLight, ...mockParamsDark }, 'dark');
       expect(colors.backgroundColor).toBe('#111111');
       expect(colors.blobFill).toBe('rgba(34, 34, 34, 0.6)'); // Example RGBA
       expect(colors.blobBorder).toBe('#333333');
       expect(colors.letterColor).toBe('#444444');
       expect(colors.borderColor).toBe('#333333');
       // Ensure themeToggle properties are not present
       expect(colors).not.toHaveProperty('themeToggleBg');
       expect(colors).not.toHaveProperty('themeToggleIcon');
    });

    // Add tests for default fallbacks if needed
  });
  */
});
