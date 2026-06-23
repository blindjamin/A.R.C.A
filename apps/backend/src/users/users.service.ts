import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioCiudadano } from './entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
  ) {}

  findCiudadanoByClaveUnicaId(claveUnicaId: string): Promise<UsuarioCiudadano | null> {
    return this.usuarioCiudadanoRepository.findOne({ where: { claveUnicaId } });
  }
}
