declare module "yuka" {
  export class EntityManager {
    add(entity: unknown): void;
    update(deltaTime: number): void;
  }

  export class Vehicle {
    maxSpeed: number;
    maxForce: number;
  }

  export class Vector3 {
    constructor(x: number, y: number, z: number);
  }

  export class SeekBehavior {
    constructor(target: Vector3);
  }
}
