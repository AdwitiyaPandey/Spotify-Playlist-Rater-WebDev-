// ─── Lane & Physics ───
export const LANE_WIDTH = 2.5;
export const LANE_COUNT = 3;
export const LANE_POSITIONS = [-(LANE_WIDTH), 0, LANE_WIDTH];
export const GRAVITY = -35;
export const JUMP_VELOCITY = 14;
export const SLIDE_DURATION = 0.6;
export const STUMBLE_DURATION = 0.5;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_SLIDE_HEIGHT = 0.6;

// ─── Game Speed ───
export const BASE_SPEED = 12;
export const MAX_SPEED = 28;
export const SPEED_RAMP = 0.15; // per second

// ─── Chunk System ───
export const CHUNK_LENGTH = 40;
export const CHUNK_BUFFER = 4; // chunks ahead to keep spawned
export const DESPAWN_BEHIND = 20;

// ─── Obstacle Types ───
export const OBSTACLE_TYPES = {
  BARRIER:  { name: 'barrier',  height: 0.8, depth: 0.6, action: 'jump' },
  LOW:      { name: 'low',      height: 2.8, depth: 0.6, action: 'slide', yOff: 1.8 },
  TALL:     { name: 'tall',     height: 3.0, depth: 0.6, action: 'dodge' },
  GAP:      { name: 'gap',      width: 3.0,  depth: 4.0, action: 'jump' },
};

// ─── Collectibles ───
export const TOKEN_VALUE = 10;
export const TOKEN_RADIUS = 0.3;
export const TOKEN_FLOAT_HEIGHT = 1.2;
export const MULTIPLIER_DECAY_TIME = 5;

// ─── Pursuer Profiles ───
export const PURSUERS = {
  LAKHAY: {
    name: 'Lakhay',
    baseDistance: 15,
    catchDistance: 2,
    lungeInterval: [6, 10],
    lungeSpeed: 1.4,
    color: 0xcc2200,
    emissive: 0x661100,
    scale: 2.2,
    biome: 'urban',
    segmentLength: 600,
  },
  YETI: {
    name: 'Yeti',
    baseDistance: 18,
    catchDistance: 2,
    lungeInterval: [5, 8],
    lungeSpeed: 1.5,
    rockThrowInterval: [4, 7],
    color: 0xccddee,
    emissive: 0x445566,
    scale: 2.8,
    biome: 'himalayan',
    segmentLength: Infinity,
  },
};

// ─── Biome configs ───
export const BIOMES = {
  bedroom: {
    name: 'Bedroom',
    fogColor: 0x0a0a15,
    fogNear: 5,
    fogFar: 30,
    ambientColor: 0x111122,
    ambientIntensity: 0.3,
    dirColor: 0xffeedd,
    dirIntensity: 0.2,
    groundColor: 0x2a1f14,
    skyColor: 0x0a0a15,
  },
  urban: {
    name: 'New Road',
    fogColor: 0x1a1520,
    fogNear: 15,
    fogFar: 80,
    ambientColor: 0x3a2a45,
    ambientIntensity: 0.4,
    dirColor: 0xffe8c0,
    dirIntensity: 0.7,
    groundColor: 0x333333,
    skyColor: 0x1a1520,
    buildingColors: [0x8b6f4e, 0x6b5a3e, 0x9e8b6e, 0x5c4a3a, 0x7a6b55],
  },
  transition: {
    name: 'Transition',
    fogColor: 0x2a3545,
    fogNear: 10,
    fogFar: 60,
    ambientColor: 0x445566,
    ambientIntensity: 0.5,
    dirColor: 0xffeedd,
    dirIntensity: 0.6,
    groundColor: 0x4a5a3a,
    skyColor: 0x2a3545,
  },
  himalayan: {
    name: 'Himalayan Pass',
    fogColor: 0xc8d8e8,
    fogNear: 20,
    fogFar: 120,
    ambientColor: 0x8899bb,
    ambientIntensity: 0.6,
    dirColor: 0xfff5e6,
    dirIntensity: 1.0,
    groundColor: 0xddeeff,
    skyColor: 0x6688bb,
    snowColor: 0xeef4ff,
    rockColor: 0x6a7a8a,
  },
};

// ─── Difficulty ───
export const DIFFICULTY = {
  obstacleFrequency: { min: 0.3, max: 0.7 },
  multiLaneChance:   { min: 0.0, max: 0.35 },
  gapChance:         { min: 0.0, max: 0.15 },
  speedScale:        { min: 1.0, max: 2.0 },
  rampTime: 120, // seconds to reach max
};

// ─── Game States ───
export const STATES = {
  LOADING: 'loading',
  INTRO: 'intro',
  RUNNING: 'running',
  TRANSITION: 'transition',
  GAME_OVER: 'gameOver',
};
