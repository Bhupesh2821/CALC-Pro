# Numerical behavior and conversion references

## Numeric types and formatting

Scientific, graph, unit and engineering modes use JavaScript’s IEEE 754 binary64 numbers. This provides about 15–17 significant decimal digits of computational precision, with integer exactness only through 2⁵³−1. The largest finite magnitude is approximately 1.7976931348623157×10³⁰⁸; the smallest positive subnormal is approximately 4.9406564584124654×10⁻³²⁴. This is not arbitrary precision, exact symbolic algebra or interval arithmetic.

Scientific/engineering results normally display 12 significant digits. Calculations retain the internal value rather than rounding every intermediate operation. Scientific history stores a round-trip numeric string for result reuse; its displayed/copyable result may be shorter. Conversion offers 6, 9, 12 or 15 significant digits. If rounding a finite maximum value upward would produce Infinity, formatting retains a finite representation instead.

Examples: `0.1+0.2` displays `0.3`, although binary floating-point does not represent both operands exactly. `1e-20` remains nonzero and is shown in scientific notation. Cancellation, subtracting nearby large values and ill-conditioned systems can lose relative accuracy. Display precision does not imply physical measurement accuracy.

## Scientific grammar and precedence

Supported syntax includes decimal/scientific notation, π or pi, e, Ans, M, parentheses, `+ - * / ^ ! %`, display operators `× ÷ −`, named functions, and implicit multiplication such as `2π`, `2(3+4)` or `(2+3)(4-1)`. Adjacent numeric literals such as `1.2.3` and `1 2` are rejected. Missing trailing closing parentheses are completed for keypad convenience; unmatched closing parentheses are rejected.

Powers associate right, while multiplication/division and addition/subtraction associate left. Powers bind more tightly than unary sign: `2^3^2 = 512`, `-2^2 = -4`, `(-2)^2 = 4`, and `2^-3 = 0.125`. Postfix factorial/percent bind to their operand. `0^0` uses the computational convention 1. Real negative-base noninteger powers produce a domain error; use an odd `nthRoot` or engineering complex mode when appropriate.

`log(x)` is base 10; `ln(x)` is natural; `logbase(x,b)` and `log(x,b)` accept an explicit base. A real logarithm requires x>0, base>0 and base≠1. `nthRoot(x,n)` and `root(x,n)` reject degree zero; a negative radicand requires an odd integer degree in real mode. `cbrt(-8)=-2`. Factorial accepts only nonnegative integers through 170; repeated factorial notation applies sequentially, rather than double-factorial notation.

`sin`, `cos`, `tan`, `asin`, `acos`, `atan` honor DEG/RAD. Hyperbolic and inverse hyperbolic functions use their usual dimensionless definitions. Exact quadrantal trig inputs are handled explicitly; a small nonzero input is not indiscriminately snapped to zero. Exact tangent poles produce a domain error, while nearby representable angles may produce large finite values. Extremely large angles are rejected beyond the engine’s reliability guard (10¹⁵ degrees or 10¹³ radians).

Additional functions include `sqrt`, `abs`, `exp`, `reciprocal`, `floor`, `ceil`, `round`, `trunc`, `min`, `max`, `mod`, `rem` and `remainder`. The minimum/maximum functions accept up to eight arguments, within parser bounds.

## Percent, modulus and remainder

A postfix percent divides its operand by 100. For addition/subtraction, when the complete right operand is a postfix-percent expression, that percentage is relative to the left value.

| Expression | Result |
| --- | ---: |
| `50%` | 0.5 |
| `(20+30)%` | 0.5 |
| `200+10%` | 220 |
| `200-10%` | 180 |
| `200*10%` | 20 |
| `200/10%` | 2000 |
| `200+10%+10%` | 242 |
| `200+10%*2` | 200.2 |

Scientific modulus follows the divisor’s sign (`-7 mod 3 = 2`, `7 mod -3 = -2`). Remainder follows the dividend’s sign (`rem(-7,3)=-1`). Both reject zero divisors. Programmer `MOD` is truncating integer remainder (`-7 MOD 3=-1`), matching BigInt division.

## Error and range policy

The UI displays actionable syntax, domain, zero-division, overflow and detected-underflow messages. It does not display NaN/Infinity as a successful scientific result. Zero denominators are checked from evaluated operands, so `1/(2-2)` and `0/0` are zero-division errors rather than string-pattern guesses.

Range guards cover nonfinite literals/results and detected zero underflow in checked operations such as multiplication, division, exponentiation and exponentials. Binary64 subnormal rounding and cancellation still apply; this is not a certified error-bound system. A real-domain error such as `sqrt(-1)` can instead be evaluated in complex mode.

Expressions are limited to 2,048 characters, 512 tokens and depth 48, with at most eight function arguments. These limits prevent unbounded parsing/evaluation work. Graph expression inputs additionally cap each function at 512 characters.

## Programmer words

Programmer values use exact BigInt arithmetic at a selected 8, 16, 32 or 64-bit word size. Parsing validates the full base-specific digit string and applies the mask only after accumulation. Matching `0b`, `0o` and `0x` prefixes and a leading sign are accepted in their respective bases. Fractions/exponents are not programmer integer syntax.

Results wrap modulo 2ⁿ, including signed arithmetic overflow. Signed DEC uses two’s-complement interpretation; HEX/OCT/BIN show the unsigned bit pattern. For 8-bit signed words, HEX FF means DEC −1; in unsigned mode the same bits mean 255. `127+1` wraps to −128 in signed 8-bit mode. No Number conversion is used for word arithmetic, so 64-bit values above 2⁵³ remain exact.

Division truncates toward zero. Shift counts must be 0 through n−1. Signed right shift is arithmetic; unsigned right shift is logical. NOT and bit toggles are masked to the selected width. Programmer input is capped at 256 characters.

## Engineering

Complex numbers are binary64 real/imaginary pairs. Functions use radians and principal branches: `sqrt(-1)=i`, `ln(-1)=πi`, and complex `cbrt(-8)` is a principal complex root rather than the real scientific `cbrt(-8)`. Functions include arithmetic/powers, roots, exp/logs, trigonometric/inverse/hyperbolic functions, absolute value, argument, real/imaginary parts and conjugation. Factorial remains restricted to real nonnegative integers through 170. Real-only functions reject nonreal arguments.

Matrices contain finite real decimal/scientific-notation values, with up to four rows/columns and 2,048 input characters. Newlines/semicolons separate rows; spaces/commas separate cells. Dimension mismatches are errors. Determinants use pivoted elimination and scaled product accumulation; inverses and AX=B use scaled partial pivoting. Small pivot ratios relative to row scale reject singular/ill-conditioned systems. Residual tests cover representative well-conditioned cases; no universal conditioning or high-accuracy guarantee is claimed. Reusing a matrix display result as A uses its displayed precision.

## Graph sampling

Graphing uses real functions and radians. Up to eight visible functions share at most 8,000 curve evaluations per render, with adaptive subdivision depth capped. Zoom scale and centers are bounded. Gaps, nonfinite values and unresolved sharp curvature split drawn segments. Finite sampling cannot prove continuity or resolve all oscillations. Selected-point readouts evaluate the actual expression independently of the sampled polyline.

## Conversion definitions

Factors are local constants; temperature uses affine formulas. Supported categories are length, mass, temperature, area, volume, speed, time, pressure, energy, power, data, angle and frequency. No live currency rates are included.

Important unit conventions:

- Lengths use international inch/foot/mile definitions, not U.S. survey units.
- Pounds/ounces are avoirdupois mass. Tonnes are 1,000 kg.
- US liquid and UK imperial gallons are labeled separately. Cups are US customary cups.
- Calories are thermochemical; BTU is the international-table British thermal unit; hp is mechanical horsepower.
- A year is the Julian year of 365.25 days (31,557,600 seconds), not a calendar-date interval.
- KB/MB/GB/TB use powers of 1,000. KiB/MiB/GiB/TiB use powers of 1,024. Eight bits equal one byte.
- Degrees/gradians/turns use π-derived binary64 factors; rpm is revolutions per minute converted to cycles per second.
- Temperature rejects values below absolute zero. Rounding at zero Kelvin is normalized where appropriate.

Representative exact defining relationships are 1 inch=0.0254 m, 1 pound=0.45359237 kg, 1 US liquid gallon=3.785411784 L and 1 standard atmosphere=101325 Pa. Some units, including mmHg, mechanical horsepower and BTU, are represented by conventional/rounded constants. All stored factors are binary64 approximations even where the decimal definition is exact.

Reference sources: [NIST SP 811 conversion factors](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors), [NIST Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8), and [BIPM SI definitions](https://www.bipm.org/en/measurement-units/). NIST distinguishes exact relationships from rounded tabulated factors; CALC Pro does not infer accuracy from the number of digits a user selects.
