/** Animation chỉ chạy khi user bật VÀ OS không yêu cầu giảm chuyển động. */
export function shouldAnimate(osReducedMotion: boolean, userEnabled: boolean): boolean {
  return userEnabled && !osReducedMotion;
}
