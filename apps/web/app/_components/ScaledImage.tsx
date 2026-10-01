import Image from "next/image";
import type { ComponentProps } from "react";

// next/image renders `width={N}` as a fixed px attribute, which would not
// follow the fluid root unit (1rem tracks viewport width, see globals.css),
// so decorations and logos would stay full size while the layout around them
// shrinks. This sets the same size in rem instead. It only steps in when the
// caller has not sized the image itself (fill, or a w-/h-/size- class).
export default function ScaledImage(props: ComponentProps<typeof Image>) {
  const { alt, width, height, fill, className = "", style, ...rest } = props;
  const hasWidthClass = /(^|\s)(?:[a-z]+:)*(?:w|size)-/.test(className);
  const hasHeightClass = /(^|\s)(?:[a-z]+:)*(?:h|size)-/.test(className);
  const numericWidth = Number(width);

  if (fill || hasWidthClass || hasHeightClass || !numericWidth) {
    return (
      <Image
        {...rest}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Image
      {...rest}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width: `${numericWidth / 16}rem`, height: "auto", ...style }}
    />
  );
}
