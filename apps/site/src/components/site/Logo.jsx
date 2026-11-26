/** The CodeArchy mark: the dark mark on light, the white one on dark (both shipped; CSS shows the right one). */
export function Logo({ size = 28 }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden="true">
      <img className="logo--on-light" src="/assets/images/mark-dark.png" alt="" width={size} height={size} />
      <img className="logo--on-dark" src="/assets/images/mark-light.png" alt="" width={size} height={size} />
    </span>
  )
}
