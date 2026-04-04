# Generating the Core Portraits

Due to API rate limiting blocks within GitHub Codespaces, the automatic batch downloading tool could not complete downloading all 197 portraits at once. 

However, all 197 perfectly formatted prompts have been generated and exported.

## How to generate the portraits yourself:
1. Open the file **`portrait_prompts.csv`** in your repository.
2. It contains the exact prompt customized for each actor's age, race, gender, and nationality.
3. Copy the prompt from Column B into your preferred Image Generator (Midjourney, Stable Diffusion, DALL-E).
4. Save the generated image as a `.webp` file matching the slug name in Column A (e.g. `mateo-ionescu.webp`).
5. Place the image inside the `public/portraits/` folder.

The game UI will automatically load them!
