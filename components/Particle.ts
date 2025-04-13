class Particle {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    radius: number;

    constructor(x: number, y: number, vx: number, vy: number, radius: number) {
        this.position = { x, y };
        this.velocity = { x: vx, y: vy };
        this.radius = radius;
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.closePath();
    }
}