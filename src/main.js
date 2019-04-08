ObjC.import('stdlib')

const NIL = $()

class Browser {
  constructor (bundleId) {
    this.app = Application(bundleId)
    this.key = {
      currentTab: 'currentTab',
      title: 'title',
      url: 'url'
    }
  }

  hasWindow () {
    return this.app.running() && this.app.windows.length
  }

  get currentTab () {
    if (this.hasWindow()) {
      return this.app.windows.at(0)[this.key.currentTab]()
    } else {

    }
  }

  get currentTabInfo () {
    var tab = this.currentTab

    if (tab) {
      return {
        selection: this.selection || '',
        title: tab[this.key.title](),
        url: tab[this.key.url]()
      }
    } else {
      return {}
    }
  }
}

class Chrome extends Browser {
  constructor () {
    super('com.google.Chrome')
    this.key.currentTab = 'activeTab'
  }

  get selection () {
    this.app.includeStandardAdditions = true
    this.app.windows.at(0).activeTab().copySelection()
    delay(0.1)
    return this.app.theClipboard()
  }
}

class Vivaldi extends Browser {
  constructor() {
      super('com.vivaldi.Vivaldi');
      this.key.currentTab = 'activeTab';
  }
}

class Safari extends Browser {
  constructor () {
    super('com.apple.Safari')
    this.key.title = 'name'
  }
}

class SafariPreview extends Browser {
  constructor () {
    super('com.apple.SafariTechnologyPreview')
    this.key.title = 'name'
  }
}

class Alfred {
  static get dataPath () {
    return $.getenv('alfred_workflow_data')
  }

  static generateOutput (data, templates) {
    const regExp = /\$\{([^}]+)\}/
    let match

    const items = templates.map(template => {
      let text = template.format

      if (text.match(/^function/)) {
        text = eval(`(${text})`)(data)
      } else {
        while ((match = regExp.exec(text))) {
          text = text.replace(match[0], data[match[1]])
        }
      }

      return {
        arg: text,
        subtitle: text,
        text,
        title: template.title
      }
    })

    return JSON.stringify({
      items
    })
  }
}

class App {
  constructor () {
    this.dataPath = Alfred.dataPath
    this.configPath = `${this.dataPath}/config.json`

    if (!this.hasConfig()) {
      this.initConfig()
    }
  }

  hasConfig () {
    return $.NSFileManager.defaultManager.fileExistsAtPath(this.configPath)
  }

  initConfig () {
    var fileManager = $.NSFileManager.defaultManager
    var config = JSON.stringify([{'format': '${url}', 'title': 'URL'}, {'format': '${title}', 'title': 'Title'}, {'format': '<a href="${url}">${title}</a>', 'title': 'Anchor'}, {'format': '[${title}](${url})', 'title': 'Markdown'}])
    var error = $()

    fileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(this.dataPath, true, NIL, error)
    fileManager.createFileAtPathContentsAttributes(this.configPath, config, NIL)
  }

  get data () {
    var processes = Application('System Events').processes
    var frontmost = processes.whose({frontmost: {'=': true}}).name().toString()

    if (frontmost === 'Google Chrome') {
      return new Chrome().currentTabInfo
    } else if (frontmost === 'Vivaldi') {
      return new Vivaldi().currentTabInfo
    } else if (frontmost === 'Safari') {
      return new Safari().currentTabInfo
    } else if (frontmost === 'Safari Technology Preview') {
      return new SafariPreview().currentTabInfo
    } else {
      if (processes.byName('Google Chrome').exists()) {
        return new Chrome().currentTabInfo
      } else if (processes.byName('Vivaldi').exists()) {
        return new Vivaldi().currentTabInfo
      } else if (processes.byName('Safari').exists()) {
        return new Safari().currentTabInfo
      } else if (processes.byName('Safari Technology Preview').exists()) {
        return new SafariPreview().currentTabInfo
      }
    }
  }

  get templates () {
    return JSON.parse($.NSString.stringWithContentsOfFile(this.configPath).js) || []
  }

  run () {
    var data = this.data
    var templates = this.templates

    if (!data || !templates) {
      return
    }

    return Alfred.generateOutput(data, templates)
  }
}

function run () {
  return new App().run()
}
