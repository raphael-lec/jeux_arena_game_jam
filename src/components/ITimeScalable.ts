// Anything that can be sped up or slowed down by a time field
export default interface ITimeScalable {
    // 1 = normal speed, < 1 = slowed down, > 1 = accelerated
    readonly timeScale: number;
    setTimeScale(scale: number): void;
}
