import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResiduoCatalogo } from './entities/residuo-catalogo.entity';

@Injectable()
export class ResiduosService {
  constructor(
    @InjectRepository(ResiduoCatalogo)
    private readonly residuoCatalogoRepository: Repository<ResiduoCatalogo>,
  ) {}

  findAllCatalogo(): Promise<ResiduoCatalogo[]> {
    return this.residuoCatalogoRepository.find({
      order: { categoria: 'ASC', nombre: 'ASC' },
    });
  }

  findCatalogoById(id: number): Promise<ResiduoCatalogo | null> {
    return this.residuoCatalogoRepository.findOne({ where: { id } });
  }
}
