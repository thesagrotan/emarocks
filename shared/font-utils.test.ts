import { 
  formatFontFamily,
  getLetterVisualBounds,
  createFontString,
  clearLetterCache,
  isFontAvailable
} from './font-utils';

// Mock browser Canvas API since we're in a test environment
global.document = {
  createElement: jest.fn(() => ({
    width: 100,
    height: 100,
    getContext: jest.fn(() => ({
      font: '',
      measureText: jest.fn(() => ({
        fontBoundingBoxAscent: 20,
        fontBoundingBoxDescent: 8,
        width: 50
      })),
      fillText: jest.fn(),
      clearRect: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100)
      }))
    }))
  }))
} as any;

// Mock console.warn to prevent cluttering test output
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.warn = jest.fn();
});
afterEach(() => {
  console.warn = originalConsoleWarn;
});

describe('font-utils', () => {
  describe('formatFontFamily', () => {
    it('returns Arial for empty input', () => {
      expect(formatFontFamily()).toBe('Arial');
      expect(formatFontFamily('')).toBe('Arial');
      expect(formatFontFamily(undefined)).toBe('Arial');
    });

    it('adds quotes around font names with spaces', () => {
      expect(formatFontFamily('Times New Roman')).toBe('"Times New Roman"');
      expect(formatFontFamily('Comic Sans MS')).toBe('"Comic Sans MS"');
    });

    it('leaves font names without spaces unquoted', () => {
      expect(formatFontFamily('Arial')).toBe('Arial');
      expect(formatFontFamily('Helvetica')).toBe('Helvetica');
      expect(formatFontFamily('Monospace')).toBe('Monospace');
    });

    it('handles font names that already have quotes', () => {
      // The function should not add additional quotes if already present
      expect(formatFontFamily('"Times New Roman"')).toBe('"Times New Roman"');
    });
  });

  describe('createFontString', () => {
    it('creates a valid font string with default values', () => {
      expect(createFontString(16)).toBe('bold normal 16px Arial');
    });

    it('creates a valid font string with custom values', () => {
      expect(createFontString(24, 'Helvetica', 'normal', 'italic'))
        .toBe('normal italic 24px Helvetica');
    });

    it('properly formats font names with spaces', () => {
      expect(createFontString(12, 'Times New Roman'))
        .toBe('bold normal 12px "Times New Roman"');
    });

    it('handles invalid inputs gracefully', () => {
      // @ts-ignore - Testing invalid input
      expect(createFontString(null)).toBe('bold normal 0px Arial');
      // @ts-ignore - Testing invalid input
      expect(createFontString('12')).toBe('bold normal 0px Arial');
    });
  });

  describe('getLetterVisualBounds', () => {
    it('calculates baseline correctly', () => {
      const result = getLetterVisualBounds('A', 32, 'bold 32px Arial');
      expect(result.baseline).toBe(-16);
    });

    it('returns metrics when available', () => {
      const result = getLetterVisualBounds('A', 32, 'bold 32px Arial');
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.fontBoundingBoxAscent).toBe(20);
      expect(result.metrics?.fontBoundingBoxDescent).toBe(8);
    });

    it('handles unavailable context gracefully', () => {
      // Mock document.createElement to return a canvas without context
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn(() => ({
        width: 100,
        height: 100,
        getContext: jest.fn(() => null)
      }));

      const result = getLetterVisualBounds('A', 32, 'bold 32px Arial');
      expect(result.baseline).toBe(0);
      expect(result.metrics).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(
        'Canvas 2D context not available for text measurement'
      );

      // Restore original implementation
      document.createElement = originalCreateElement;
    });

    it('handles errors during measurement gracefully', () => {
      // Mock document.createElement to throw an error
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn(() => ({
        width: 100,
        height: 100,
        getContext: jest.fn(() => ({
          font: '',
          measureText: jest.fn(() => {
            throw new Error('Mock error');
          })
        }))
      }));

      const result = getLetterVisualBounds('A', 32, 'bold 32px Arial');
      expect(result.baseline).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        'Error measuring text "A" with font "bold 32px Arial":', expect.any(Error)
      );

      // Restore original implementation
      document.createElement = originalCreateElement;
    });
  });

  describe('clearLetterCache', () => {
    it('clears a valid cache map', () => {
      const mockMap = new Map();
      mockMap.set('test1', { data: 'data1' });
      mockMap.set('test2', { data: 'data2' });
      
      clearLetterCache(mockMap);
      expect(mockMap.size).toBe(0);
    });

    it('handles null/undefined gracefully', () => {
      // @ts-ignore - Testing invalid input
      clearLetterCache(null);
      // @ts-ignore - Testing invalid input
      clearLetterCache(undefined);
      // Should not throw errors
    });

    it('handles non-map objects gracefully', () => {
      // @ts-ignore - Testing invalid input
      clearLetterCache({});
      // @ts-ignore - Testing invalid input
      clearLetterCache([]);
      // Should not throw errors
    });
  });

  describe('isFontAvailable', () => {
    // Note: This test is limited due to JSDOM limitations
    it('returns false when context is unavailable', () => {
      // Mock document.createElement to return a canvas without context
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn(() => ({
        width: 100,
        height: 100,
        getContext: jest.fn(() => null)
      }));

      expect(isFontAvailable('Arial')).toBe(false);

      // Restore original implementation
      document.createElement = originalCreateElement;
    });

    it('handles errors gracefully', () => {
      // Mock document.createElement to throw an error during measure
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn(() => ({
        width: 100,
        height: 100,
        getContext: jest.fn(() => ({
          font: '',
          measureText: jest.fn(() => {
            throw new Error('Mock error');
          })
        }))
      }));

      expect(isFontAvailable('Arial')).toBe(false);

      // Restore original implementation
      document.createElement = originalCreateElement;
    });

    it('detects font differences', () => {
      // Setup mock to simulate different text widths for different fonts
      const originalCreateElement = document.createElement;
      let callCount = 0;
      document.createElement = jest.fn(() => ({
        width: 100,
        height: 100,
        getContext: jest.fn(() => ({
          font: '',
          measureText: jest.fn(() => {
            callCount++;
            // Return different width on second call to simulate a different font
            return { width: callCount === 1 ? 100 : 120 };
          })
        }))
      }));

      expect(isFontAvailable('Some Font')).toBe(true);

      // Restore original implementation
      document.createElement = originalCreateElement;
    });
  });
});