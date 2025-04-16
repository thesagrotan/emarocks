import { logError, logWarn, logInfo } from './logger';

describe('Logger Utilities', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods before each test
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods after each test
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('logError should call console.error with prefix and message', () => {
    logError('Test error message');
    expect(errorSpy).toHaveBeenCalledWith('[BlobSim]: Test error message', '');
  });

  it('logError should include context', () => {
    const errorContext = { code: 500, details: 'Server down' };
    logError('Test error with context', errorContext);
    expect(errorSpy).toHaveBeenCalledWith('[BlobSim]: Test error with context', errorContext);
  });

  it('logError should include source', () => {
    logError('Test error with source', undefined, 'MyFunction');
    expect(errorSpy).toHaveBeenCalledWith('[BlobSim] (MyFunction): Test error with source', '');
  });

  it('logError should include source and context', () => {
    const errorContext = new Error('Something failed');
    logError('Test error with source and context', errorContext, 'MyComponent');
    expect(errorSpy).toHaveBeenCalledWith('[BlobSim] (MyComponent): Test error with source and context', errorContext);
  });

  it('logWarn should call console.warn with prefix and message', () => {
    logWarn('Test warning message');
    expect(warnSpy).toHaveBeenCalledWith('[BlobSim]: Test warning message', '');
  });

  it('logWarn should include context', () => {
    const warnContext = { status: 'deprecated' };
    logWarn('Test warning with context', warnContext);
    expect(warnSpy).toHaveBeenCalledWith('[BlobSim]: Test warning with context', warnContext);
  });

  it('logWarn should include source', () => {
    logWarn('Test warning with source', undefined, 'Utils');
    expect(warnSpy).toHaveBeenCalledWith('[BlobSim] (Utils): Test warning with source', '');
  });

  it('logInfo should call console.log with prefix and message', () => {
    logInfo('Test info message');
    expect(logSpy).toHaveBeenCalledWith('[BlobSim]: Test info message', '');
  });

  it('logInfo should include context and source', () => {
    const infoContext = { step: 1, status: 'processing' };
    logInfo('Test info with context and source', infoContext, 'AnimationLoop');
    expect(logSpy).toHaveBeenCalledWith('[BlobSim] (AnimationLoop): Test info with context and source', infoContext);
  });
});
