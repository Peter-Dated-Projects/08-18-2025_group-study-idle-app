export interface Collider {
  position: { x: number; y: number };
  type: string;
}

export interface RectangleCollider extends Collider {
  type: "rectangle";
  width: number;
  height: number;
}

export function isCollided(colliders: Collider[]): boolean {
  // For now, check collision between first two rectangle colliders
  if (colliders.length < 2) return false;

  const collider1 = colliders[0] as RectangleCollider;
  const collider2 = colliders[1] as RectangleCollider;

  if (collider1.type !== "rectangle" || collider2.type !== "rectangle") {
    return false;
  }

  // AABB collision detection
  const left1 = collider1.position.x - collider1.width / 2;
  const right1 = collider1.position.x + collider1.width / 2;
  const top1 = collider1.position.y - collider1.height / 2;
  const bottom1 = collider1.position.y + collider1.height / 2;

  const left2 = collider2.position.x - collider2.width / 2;
  const right2 = collider2.position.x + collider2.width / 2;
  const top2 = collider2.position.y - collider2.height / 2;
  const bottom2 = collider2.position.y + collider2.height / 2;

  return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
}

export function checkCollisionBetweenTwoRects(
  rect1: RectangleCollider,
  rect2: RectangleCollider
): boolean {
  return isCollided([rect1, rect2]);
}

export function createRectangleCollider(
  x: number,
  y: number,
  width: number,
  height: number
): RectangleCollider {
  return {
    type: "rectangle",
    position: { x, y },
    width,
    height,
  };
}
