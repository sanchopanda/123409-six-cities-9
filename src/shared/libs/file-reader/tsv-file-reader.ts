import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';
import { FileReader } from './file-reader.interface.js';
import { City, Comfort, Coordinates, HouseType, Offer, User, UserType } from '../../types/index.js';

const CHUNK_SIZE = 16384; // 16KB

export class TSVFileReader extends EventEmitter implements FileReader {
  constructor(
    private readonly filename: string
  ) {
    super();
  }

  private parseLineToOffer(line: string): Offer {
    const [
      title,
      description,
      date,
      city,
      previewImage,
      images,
      isPremium,
      isFavorite,
      rating,
      type,
      bedrooms,
      maxAdults,
      price,
      comforts,
      user,
      commentsCount,
      coordinates,
    ] = line.split('\t');

    return {
      title,
      description,
      date: new Date(date),
      city: city as City,
      previewImage,
      images: images.split(';'),
      isPremium: this.parseBoolean(isPremium),
      isFavorite: this.parseBoolean(isFavorite),
      rating: Number.parseFloat(rating),
      type: type as HouseType,
      bedrooms: this.parseToNumber(bedrooms),
      maxAdults: this.parseToNumber(maxAdults),
      price: this.parsePrice(price),
      comforts: comforts.split(';') as Comfort[],
      user: this.parseUser(user),
      commentsCount: this.parseToNumber(commentsCount),
      coordinates: coordinates.split(';').map((coordinate) => Number.parseFloat(coordinate)) as Coordinates
    };
  }

  private parseBoolean(value: string): boolean {
    return value === 'true';
  }

  private parsePrice(priceString: string): number {
    return Number.parseInt(priceString, 10);
  }

  private parseToNumber(value: string): number {
    return Number.parseInt(value, 10);
  }

  private parseUser(user: string): User {
    const [name, email, avatarPath, type] = user.split(';');
    return { name, email, avatarPath, type: type as UserType };
  }

  private async processLine(line: string): Promise<void> {
    if (line.trim()) {
      const parsedOffer = this.parseLineToOffer(line.trim());
      await new Promise((resolve) => {
        this.emit('line', parsedOffer, resolve);
      });
    }
  }

  public async read(): Promise<void> {
    const readStream = createReadStream(this.filename, {
      highWaterMark: CHUNK_SIZE,
      encoding: 'utf-8',
    });

    let remainingData = '';
    let importedRowCount = 0;

    for await (const chunk of readStream) {
      remainingData += chunk.toString();
      let lineEndIndex = remainingData.indexOf('\n');
      while (lineEndIndex >= 0) {
        const completeRow = remainingData.slice(0, lineEndIndex);
        remainingData = remainingData.slice(lineEndIndex + 1);
        await this.processLine(completeRow);
        importedRowCount++;
        lineEndIndex = remainingData.indexOf('\n');
      }
    }

    if (remainingData) {
      await this.processLine(remainingData);
      importedRowCount++;
    }

    this.emit('end', importedRowCount);
  }
}
