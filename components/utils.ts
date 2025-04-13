export function poissonDiskSampling(width: number, height: number, radius: number, k: number): Array<{ x: number; y: number }> {
    const grid = new Array(Math.floor(width / radius)).fill(null).map(() => new Array(Math.floor(height / radius)).fill(null));
    const queue: Array<{ x: number; y: number }> = [];
    const result: Array<{ x: number; y: number }> = [];
    
    const initialPoint = { x: Math.random() * width, y: Math.random() * height };
    queue.push(initialPoint);
    result.push(initialPoint);
    grid[Math.floor(initialPoint.x / radius)][Math.floor(initialPoint.y / radius)] = initialPoint;

    while (queue.length > 0) {
        const point = queue[Math.floor(Math.random() * queue.length)];
        let found = false;
        
        for (let i = 0; i < k; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const r = Math.random() * radius + radius;
            const newPoint = {
                x: point.x + r * Math.cos(angle),
                y: point.y + r * Math.sin(angle)
            };
            
            if (isValid(newPoint, width, height, radius, grid)) {
                queue.push(newPoint);
                result.push(newPoint);
                grid[Math.floor(newPoint.x / radius)][Math.floor(newPoint.y / radius)] = newPoint;
                found = true;
                break;
            }
        }
        
        if (!found) {
            const index = queue.indexOf(point);
            queue.splice(index, 1);
        }
    }
    
    return result;
}

function isValid(point: { x: number; y: number }, width: number, height: number, radius: number, grid: any[][]): boolean {
    if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) {
        return false;
    }
    
    const gridX = Math.floor(point.x / radius);
    const gridY = Math.floor(point.y / radius);
    
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            const neighbor = grid[gridX + i] && grid[gridX + i][gridY + j];
            if (neighbor) {
                const d = Math.sqrt(Math.pow(neighbor.x - point.x, 2) + Math.pow(neighbor.y - point.y, 2));
                if (d < radius) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

export function hexToRgba(hex: string, alpha: number = 1): string {
    let r: number, g: number, b: number;

    if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else {
        throw new Error('Invalid hex color');
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}