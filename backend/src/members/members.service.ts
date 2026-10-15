import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TenancyContext } from '../tenancy/tenancy.context';
import { Member } from './member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    private readonly tenancy: TenancyContext,
  ) {}

  private tenantId(): number {
    return this.tenancy.requireTenantId();
  }

  findAll(search?: string): Promise<Member[]> {
    const tenantId = this.tenantId();
    const term = search?.trim();
    if (!term) {
      return this.members.find({ where: { tenantId }, order: { name: 'ASC' } });
    }
    const like = Like(`%${term}%`);
    return this.members.find({
      where: [
        { tenantId, name: like },
        { tenantId, email: like },
        { tenantId, phone: like },
      ],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Member> {
    const member = await this.members.findOneBy({ id, tenantId: this.tenantId() });
    if (!member) {
      throw new NotFoundException(`Member #${id} not found`);
    }
    return member;
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    const email = dto.email.toLowerCase();
    await this.ensureEmailAvailable(email);
    return this.members.save(this.members.create({ ...dto, email, tenantId: this.tenantId() }));
  }

  async update(id: number, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOne(id);
    if (dto.email) {
      dto.email = dto.email.toLowerCase();
      if (dto.email !== member.email) {
        await this.ensureEmailAvailable(dto.email);
      }
    }
    Object.assign(member, dto);
    return this.members.save(member);
  }

  async remove(id: number): Promise<void> {
    const member = await this.findOne(id);
    const activeLoans = await this.loans.count({ where: { member: { id }, returnDate: IsNull() } });
    if (activeLoans > 0) {
      throw new BadRequestException('Cannot delete a member who still has borrowed books');
    }
    await this.members.remove(member);
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    if (await this.members.existsBy({ email, tenantId: this.tenantId() })) {
      throw new ConflictException(`A member with email ${email} already exists`);
    }
  }
}
