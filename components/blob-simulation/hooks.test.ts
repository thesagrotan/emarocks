import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { initializeBlobs, useLetterAreaCalculation } from './hooks';
import { SimulationParams, RestrictedAreaParams } from './types';
import { Blob } from './blob';
import * as SimulationUtils from './utils';

// Mock the SimulationUtils modules
vi.mock('./utils', () => ({
  drawLetter: vi.fn(),
  isPointInLetter: vi.fn(),
  getLetterVisualBounds: vi.fn(),
  isOverlappingOtherBlobs: vi.fn(() => false), // Default to not overlapping
  letterShapeCache: {
    clear: vi.fn()
  }
}));

// Mock the Blob class
vi.mock('./blob', () => ({
  Blob: class MockBlob {
    centre: { x: number; y: number };
    particles: { pos: { x: number; y: number } }[];
    repelDistance: number;
    maxRadius: number;
    
    constructor(x: number, y: number, edgePoints: number, minSize: number, repelDistance: number) {
      this.centre = { x, y };
      this.particles = [];
      this.repelDistance = repelDistance;
      this.maxRadius = minSize;
    }
  }
}));

describe('hooks.ts tests', () => {
  // Mock canvas and context
  let mockCtx: any;
  let mockCanvas: any;
  
  beforeEach(() => {
    // Create mock canvas context
    mockCtx = {
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4) // Create a 100x100 black image
      })),
      fillStyle: '',
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn()
    };
    
    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
      width: 100,
      height: 100
    };
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('initializeBlobs', () => {
    const defaultParams: SimulationParams = {
      shapeCount: 10,
      edgePointCount: 5,
      minBlobSize: 5,
      repelDistance: 2,
      containerMargin: 10,
      fontFamily: 'Arial',
      // Add other required properties with default values
      springTension: 0.1,
      interactionStrength: 0.1,
      gravity: 0,
      damping: 0.1,
      maxExpansionFactor: 1.2,
      speed: 1,
      isRoundedContainer: false,
      showBorder: true,
      backgroundColor: '#ffffff',
      darkBackgroundColor: '#000000',
      blobFillColor: '#cccccc',
      blobFillOpacity: 0.5,
      darkBlobFillColor: '#333333',
      darkBlobFillOpacity: 0.5,
      blobBorderColor: '#999999',
      darkBlobBorderColor: '#666666',
      letterColor: '#000000',
      darkLetterColor: '#ffffff',
      themeToggleBgColorLight: '#ffffff',
      themeToggleBgColorDark: '#000000',
      themeToggleIconColorLight: '#000000',
      themeToggleIconColorDark: '#ffffff',
      toolMode: null,
      restrictedAreaEnabled: true,
      restrictedAreaShape: 'letter',
      restrictedAreaSize: 50,
      restrictedAreaLetter: 'A',
      restrictedAreaMargin: 2,
      restrictedAreaX: undefined,
      restrictedAreaY: undefined
    };
    
    const defaultRestrictedArea: RestrictedAreaParams = {
      x: 25,
      y: 25,
      size: 50,
      margin: 2,
      letter: 'A',
      fontFamily: 'Arial'
    };
    
    it('should create blobs with the specified count when no restricted area', () => {
      // Mock isPointInLetter to always return false (no letter constraint)
      vi.mocked(SimulationUtils.isPointInLetter).mockReturnValue(false);
      
      const params = { ...defaultParams, restrictedAreaEnabled: false };
      const result = initializeBlobs(mockCtx, params, 100, undefined, '#000000');
      
      // Should create exactly the specified number of blobs
      expect(result.length).toBe(params.shapeCount);
    });
    
    it('should create blobs inside and outside letter based on area ratio', () => {
      // First, mock letters to cover 20% of canvas area
      const mockImageData = {
        data: new Uint8ClampedArray(100 * 100 * 4).fill(0)
      };
      
      // Set 20% of pixels to be non-zero (simulating letter)
      for (let i = 0; i < 20 * 100 * 4; i += 4) {
        mockImageData.data[i] = 255; // R channel
      }
      
      mockCtx.getImageData = vi.fn(() => mockImageData);
      
      // Mock letter detection
      let insideLetterCounter = 0;
      let outsideLetterCounter = 0;
      
      // Mock to track inside/outside counts
      vi.mocked(SimulationUtils.isPointInLetter).mockImplementation((_, __, ___, ____, _____, x, y) => {
        // Inside letter for the first 20% of calls to simulate 20% area
        const result = insideLetterCounter + outsideLetterCounter < 10 * 0.2;
        if (result) {
          insideLetterCounter++;
          return true;
        } else {
          outsideLetterCounter++;
          return false;
        }
      });
      
      const result = initializeBlobs(mockCtx, defaultParams, 100, defaultRestrictedArea, '#000000');
      
      // Should create fewer than specified blobs due to constraints
      expect(result.length).toBeLessThanOrEqual(defaultParams.shapeCount);
      
      // Verify that isPointInLetter was called
      expect(SimulationUtils.isPointInLetter).toHaveBeenCalled();
    });
    
    it('should respect canvas boundaries and container margin', () => {
      const margin = 15;
      const params = { ...defaultParams, containerMargin: margin };
      const result = initializeBlobs(mockCtx, params, 100, undefined, '#000000');
      
      // All blobs should be within the container margins
      result.forEach(blob => {
        expect(blob.centre.x).toBeGreaterThanOrEqual(margin);
        expect(blob.centre.x).toBeLessThanOrEqual(100 - margin);
        expect(blob.centre.y).toBeGreaterThanOrEqual(margin);
        expect(blob.centre.y).toBeLessThanOrEqual(100 - margin);
      });
    });
    
    it('should handle edge case: very small blob count', () => {
      const params = { ...defaultParams, shapeCount: 1 };
      const result = initializeBlobs(mockCtx, params, 100, undefined, '#000000');
      
      // Should create exactly 1 blob
      expect(result.length).toBe(1);
    });
    
    it('should handle edge case: very large blob count', () => {
      const params = { ...defaultParams, shapeCount: 1000 };
      const result = initializeBlobs(mockCtx, params, 100, undefined, '#000000');
      
      // May create fewer than requested due to space constraints
      expect(result.length).toBeLessThanOrEqual(1000);
      // But should create a significant number
      expect(result.length).toBeGreaterThan(0);
    });
    
    it('should handle edge case: restricted area at edge of canvas', () => {
      const edgeRestrictedArea: RestrictedAreaParams = {
        x: 0, // At the very edge
        y: 0,
        size: 50,
        margin: 2,
        letter: 'A',
        fontFamily: 'Arial'
      };
      
      const result = initializeBlobs(mockCtx, defaultParams, 100, edgeRestrictedArea, '#000000');
      
      // Should still create blobs
      expect(result.length).toBeGreaterThan(0);
    });
    
    it('should filter out blobs inside the letter after distribution', () => {
      // Set up to allow all blobs, then filter out half of them
      vi.mocked(SimulationUtils.isPointInLetter)
        .mockReturnValueOnce(false) // Initial check during placement
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        // Final filter checks
        .mockReturnValueOnce(true)  // Filter out 1st blob
        .mockReturnValueOnce(false) // Keep 2nd blob
        .mockReturnValueOnce(true)  // Filter out 3rd blob
        .mockReturnValueOnce(false) // Keep 4th blob
        .mockReturnValueOnce(true); // Filter out 5th blob
      
      const params = { ...defaultParams, shapeCount: 5 };
      const result = initializeBlobs(mockCtx, params, 100, defaultRestrictedArea, '#000000');
      
      // Should have 2 blobs after filtering (5 created, 3 filtered out)
      expect(result.length).toBe(2);
    });
  });
});