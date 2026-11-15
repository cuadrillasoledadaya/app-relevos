import * as migration_20261114_101337 from './20261114_101337';
import * as migration_20261115_161115 from './20261115_161115';

export const migrations = [
  {
    up: migration_20261114_101337.up,
    down: migration_20261114_101337.down,
    name: '20261114_101337',
  },
  {
    up: migration_20261115_161115.up,
    down: migration_20261115_161115.down,
    name: '20261115_161115'
  },
];
