# musicVibes

## Use at your own risk

### Compatibility 
Linux only

### How to use
- Download this repo
- Download [intiface-central](https://github.com/intiface/intiface-central/releases)
- `cd` into this repo directory
- Run `npm i` to install the dependecnys
- Start the intiface server
- Connect vibration device to intiface (note only the first connected device will be used)
- open `index.mjs` and change Frequency range and threshold  if desired (default is 20-150Hz and 0.15)
- start musicVibes with node `index.mjs`
- start playing music

## Common Issues
- Music plays but musicVibes does not detect it
  - using something like [pavucontrol (Volume Control)](https://flathub.org/en/apps/org.pulseaudio.pavucontrol) check to make sure the monitor device is set to your active playback device