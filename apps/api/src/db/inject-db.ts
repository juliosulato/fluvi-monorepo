import { Inject } from '@nestjs/common';

export const DB = Symbol('DB');

export const InjectDb = () => Inject(DB);
