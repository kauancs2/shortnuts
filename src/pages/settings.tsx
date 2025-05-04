import { Shortcuts } from "../components/shortcuts";

export function Settings(){

    return(
    <div className="bg-[#222222] h-screen p-4 text-white">
        <h1 className="text-2xl pt-2 pl-3">Settings</h1>

        <div className="pl-2">
        <div className="flex items-center relative top-2">
            <h1 className="pl-10">type</h1>
            <h1 className="pl-28">resolution</h1>
            <h1 className="pl-24">file</h1>
            <div className="pl-27">

            <h1>key combo</h1>
            </div>
            <h1 className="pl-24">keybind</h1>
        </div>

                 <Shortcuts id="1"/>
                 <Shortcuts id="2"/>
                 <Shortcuts id="3"/>
                 <Shortcuts id="4"/>
                 <Shortcuts id="5"/>

        </div>
    </div>
    )
}

