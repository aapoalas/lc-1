# Launch Complex 1

This is a theoretical Deno library for interfacing with a C++ dynamic library.
The C++ library does not expose a proper C API but instead implements plain C++
APIs together with some C function pointers for callbacks.

Due to the C++ ABI there are relatively many "return pointer" cases used in the
Deno code. These can be found by the `UnsafeOwnedPointer` class usage, which
implements a `Deno.UnsafePointer` together with an ArrayBuffer that the
`UnsafePointer` references.

The LC-1 library itself (not present in the repo at present) implements a
similar class hierarchy as this Deno library. At the core there is a
LaunchComplex class, for which a LaunchPad can be built. A LaunchPad can
(perhaps illogically) contain many LaunchTowers, and those can then be used to
prepare and launch Rockets. A Rocket is suspiciously similar to an HTTP request;
it flies off from the LaunchTower and sends telemetry data once it has landed
(or eg. destroyed). All other rocket missions except the research missions only
send a single packet of telemetry at the end of their missions. Research
missions on the other hand will keep sending new data (with varying frequency
based on findings) until they're explicitly disposed of.

The telemetry is reported using a callback-turned-stream through the LaunchTower
where it launched from. Information about new telemetry being available is
delivered to the LaunchTower using a thread safe callback. This comms callback
is called whenever new telemetry data is available, but it does not carry any of
the telemetry data itself. To get the rocket telemetry data, the LaunchTower
must call the `processComms` API which will then synchronously call a telemetry
data callback for those rockets for which new telemetry data is available. This
can be thought of as being sort of a crank handle on a C++ side "manual" event
loop: The comms callback is a wakeup for the event loop, and it is expected that
the event loop will then "turn" the C++ event loop as well.

## Future work

There are many unexplored parts of the LC-1 library that I want to incorporate
into these theoretical Deno bindings. Some of these include:

- A class used to allow the Launch Complex to create Landing Pads for other
  Launch Compelexes to send rockets into (including research missions for
  teaching).
- A class used to receive information and react to the Launch Complex itself
  moving from place to place and receiving new information that can then be
  incorporated into Landing Pads, to be then passed onto other rockets.
- A class used to track the profitability and efficiency of the entire Launch
  Complex.
- A class used to get permissions from the government for rockets to land on
  other planets and other Launch Complexes' Landing Pads. The rocket does
  already have provisions for carrying these permissions but they're not
  properly handled at present.
- A class used to advertise potentially very large caches of valuable data to
  other Launch Complexes that can be fetched using a series of rockets. The same
  class can be used to also fetch similar caches from other Launch Complexes
  that they advertise.
