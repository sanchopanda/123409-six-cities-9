import { Command } from './command.interface.js';
import got from 'got';
import { MockServerData } from '../../shared/types/mock-server.type.js';
import { appendFile } from 'node:fs/promises';
import { TSVOfferGenerator } from '../../shared/libs/offer-generator/index.js';

export class GenerateCommand implements Command {
  private initialData: MockServerData;


  private async loadInitialData(url: string): Promise<void> | never {
    try {
      this.initialData = await got.get(url).json();
    } catch (error) {
      throw new Error(`Can't load data from ${url}`);
    }
  }

  private async write(filepath: string, offerCount: number): Promise<void> {
    const tsvOfferGenerator = new TSVOfferGenerator(this.initialData);
    for (let i = 0; i < offerCount; i++) {
      await appendFile(
        filepath,
        `${tsvOfferGenerator.generate()}\n`,
        { encoding: 'utf8' }
      );
    }
  }


  public getName(): string {
    return '--generate';
  }


  public async execute(...parameters: string[]): Promise<void> {
    const [count, filepath, url] = parameters;
    const offerCount = Number.parseInt(count, 10);

    try {
      await this.loadInitialData(url);
      await this.write(filepath, offerCount);
      console.info(`File ${filepath} was created!`);
    } catch (error: unknown) {
      console.error('Can\'t generate data');

      if (error instanceof Error) {
        console.error(error.message);
      }
    }

  }
}

