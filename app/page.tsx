'use client'
import { useState } from 'react'
import { Excalidraw, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw"
import * as fal from "@fal-ai/serverless-client"
import Image from 'next/image'

fal.config({
  proxyUrl: "/api/fal/proxy",
})

const seed = Math.floor(Math.random() * 100000)
const baseArgs = {
  sync_mode: true,
  strength: .99,
  seed
}
export default function Home() {
  const [input, setInput] = useState('masterpice, best quality, A cinematic shot of a baby raccoon wearing an intricate italian priest robe')
  const [image, setImage] = useState(null)
  const [sceneData, setSceneData] = useState<any>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [_appState, setAppState] = useState<any>(null)

  const { send } = fal.realtime.connect('110602490-sdxl-turbo-realtime', {
    connectionKey: 'realtime-nextjs-app',
    onResult(result) {
      if (result.error) return
      setImage(result.images[0].url)
    }
  })

  async function getDataUrl(appState = _appState) {
    const elements = excalidrawAPI.getSceneElements()
    if (!elements || !elements.length) return
    const blob = await exportToBlob({
      elements,
      exportPadding: 0,
      appState,
      quality: 0.5,
      files: excalidrawAPI.getFiles(),
      getDimensions: () => { return {width: 450, height: 450}}
    })
    return await new Promise(r => {let a=new FileReader(); a.onload=r; a.readAsDataURL(blob)}).then(e => e.target.result)
  }

  return (
    <main className="p-12">
      <p className="text-xl mb-2">Fal SDXL Turbo</p>
      <input
        className='border rounded-lg p-2 w-full mb-2'
        value={input}
        onChange={async (e) => {
          setInput(e.target.value)
          let dataUrl = await getDataUrl()
          send({
            ...baseArgs,
            prompt: e.target.value,
            image_url: dataUrl
          })
        }}
      />
      <div className='flex'>
        <div className="w-[550px] h-[570px]">
          <Excalidraw
            excalidrawAPI={(api)=> setExcalidrawAPI(api)}
            onChange={async (elements, appState) => {
              const newSceneData = serializeAsJSON(
                elements,
                appState,
                excalidrawAPI.getFiles(),
                'local'
              )
              if (newSceneData !== sceneData) {
                setAppState(appState)
                setSceneData(newSceneData)
                let dataUrl = await getDataUrl(appState)
                send({
                  ...baseArgs,
                  image_url: dataUrl,
                  prompt: input,
                })
              }
            }}
          />
        </div>
        {
          image && (
            <Image
              src={image}
              width={550}
              height={550}
              alt='fal image'
            />
          )
        }
      </div>
    </main>
  )
}