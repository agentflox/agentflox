import { Module } from '@nestjs/common';
import { MarketplaceController } from '@/controllers/marketplace.controller';

@Module({
    controllers: [MarketplaceController],
    providers: [],
})
export class MarketplaceModule { }
