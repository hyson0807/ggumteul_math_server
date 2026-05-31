export const ROOM_SLOTS = [
  'desk',
  'shelf',
  'clock',
  'bed',
  'light',
  'rug',
  'wallpaper',
  'toy',
  'window',
] as const;

export type RoomSlot = (typeof ROOM_SLOTS)[number];

export const ROOM_SLOT_TO_FIELD: Record<
  RoomSlot,
  | 'equippedDeskId'
  | 'equippedShelfId'
  | 'equippedClockId'
  | 'equippedBedId'
  | 'equippedLightId'
  | 'equippedRugId'
  | 'equippedWallpaperId'
  | 'equippedToyId'
  | 'equippedWindowId'
> = {
  desk: 'equippedDeskId',
  shelf: 'equippedShelfId',
  clock: 'equippedClockId',
  bed: 'equippedBedId',
  light: 'equippedLightId',
  rug: 'equippedRugId',
  wallpaper: 'equippedWallpaperId',
  toy: 'equippedToyId',
  window: 'equippedWindowId',
};

export function isRoomSlot(value: string): value is RoomSlot {
  return (ROOM_SLOTS as readonly string[]).includes(value);
}
