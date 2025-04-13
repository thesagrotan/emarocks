class Spring {
    constructor(public mass: number, public stiffness: number, public damping: number) {}

    public calculateForce(position: number, velocity: number): number {
        const springForce = -this.stiffness * position;
        const dampingForce = -this.damping * velocity;
        return springForce + dampingForce;
    }

    public updatePosition(position: number, velocity: number, timeStep: number): number {
        const force = this.calculateForce(position, velocity);
        const acceleration = force / this.mass;
        velocity += acceleration * timeStep;
        position += velocity * timeStep;
        return position;
    }
}