import clsx from 'clsx';
import logoSrc from '../../assets/MoniqLogo.png';
import mascotSrc from '../../assets/MoniqMascot.png';

/** Product name, for non-visual uses (page titles, alt text, copy). */
export const APP_NAME = 'Moniq';

/**
 * Moniq wordmark (mascot + "Moniq" lettering, ~3:1, transparent background).
 *
 * The image already contains the product name, so it is never paired with a
 * text label; it carries the accessible name itself via `alt`. Size it by
 * height only — width follows the aspect ratio.
 *
 * The lettering is dark plum, so on dark surfaces wrap it with `onDark` to
 * place it on a light card and keep it legible.
 */
export const Logo = ({ className, onDark = false }: { className?: string; onDark?: boolean }) => {
  const image = (
    <img
      src={logoSrc}
      alt={APP_NAME}
      width={1080}
      height={361}
      draggable={false}
      className={clsx('block w-auto select-none', className ?? 'h-10')}
    />
  );

  if (!onDark) {
    // In dark mode the plum lettering needs the same light backing as `onDark`.
    return (
      <span className="inline-flex dark:rounded-2xl dark:bg-white/95 dark:px-3 dark:py-1.5 dark:shadow-subtle">
        {image}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-2xl bg-white/95 px-3 py-1.5 shadow-subtle">{image}</span>
  );
};


/**
 * Mascot only (square crop of the wordmark), for compact spots such as the
 * collapsed sidebar rail. Decorative by default because it is always inside a
 * control that carries its own label.
 */
export const Mascot = ({ className }: { className?: string }) => (
  <img
    src={mascotSrc}
    alt=""
    aria-hidden="true"
    width={256}
    height={256}
    draggable={false}
    className={clsx('block select-none object-contain', className ?? 'h-9 w-9')}
  />
);
